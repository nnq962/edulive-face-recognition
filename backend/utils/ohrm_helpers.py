from typing import Dict, List, Sequence, TypedDict
from config.database import get_mysql_session 
from sqlalchemy import text, bindparam, Date
from datetime import datetime, date
import pytz
from utils import LOGGER

# Cấu hình múi giờ
VN_TZ = pytz.timezone('Asia/Saigon')
UTC = pytz.utc


class PunchCommand(TypedDict):
    """
    Payload chuẩn hóa cho batch punch in/out.

    Attributes:
        emp_id: OrangeHRM employee_id (emp_number)
        time: Timestamp (UTC hoặc timezone-aware) cần lưu xuống OrangeHRM
        note: Tùy chọn, ghi chú thêm (camera, nguồn,...)
    """

    emp_id: int
    time: datetime
    note: str | None

def _prepare_time_data(user_dt: datetime | None = None) -> tuple[datetime, datetime]:
    """
    Chuẩn hóa timestamp sang 2 múi giờ:
        - UTC (lưu vào DB OrangeHRM)
        - User time (Asia/Saigon)
    """
    if user_dt is None:
        user_time = datetime.now(VN_TZ)
    else:
        if user_dt.tzinfo is None:
            user_time = VN_TZ.localize(user_dt)
        else:
            user_time = user_dt.astimezone(VN_TZ)
    
    utc_time = user_time.astimezone(UTC)
    return utc_time, user_time


async def get_employee_ids(emails: Sequence[str]) -> Dict[str, int]:
    """
    Lấy OrangeHRM emp_number cho danh sách email/user_name.

    Hàm này thường được gọi từ `process_attendance_detections` để map
    user Mongo -> employee_id trong OrangeHRM.

    Args:
        emails: Danh sách email/user_name khớp với cột `user_name` (case-sensitive).

    Returns:
        Dict mapping user_name/email -> emp_number.
    """
    if not emails:
        return {}

    unique_emails = list(dict.fromkeys(emails))  # preserve order, remove duplicates

    try:
        async with get_mysql_session() as session:
            query = text("SELECT user_name, emp_number FROM ohrm_user WHERE user_name IN :emails")
            query = query.bindparams(bindparam('emails', expanding=True))
            
            result = await session.execute(query, {"emails": unique_emails})
            rows = result.mappings().all()
            return {row['user_name']: row['emp_number'] for row in rows}

    except Exception as e:
        LOGGER.error(f"Lỗi lấy OrangeHRM emp_number: {e}")
        return {}


async def batch_punch_in(records: List[PunchCommand]) -> None:
    """
    Thực hiện Punch In hàng loạt.
    
    Args:
        records: Danh sách `PunchCommand` đã chuẩn hóa. Mỗi phần tử
                 tương ứng với timestamp check-in đầu tiên của user trong ngày.
    """
    if not records:
        return

    insert_data = []
    for rec in records:
        utc_time, user_time = _prepare_time_data(rec.get('time'))
        insert_data.append({
            "emp_id": rec['emp_id'],
            "utc_time": utc_time,
            "user_time": user_time,
            "note": rec.get('note') or ''
        })

    try:
        async with get_mysql_session() as session:
            try:
                query = text("""
                    INSERT INTO ohrm_attendance_record 
                    (employee_id, punch_in_utc_time, punch_in_time_offset, punch_in_user_time, 
                     state, punch_in_timezone_name, punch_in_note) 
                    VALUES 
                    (:emp_id, :utc_time, '7', :user_time, 'PUNCHED IN', 'Asia/Saigon', :note)
                """)
                
                await session.execute(query, insert_data)
                await session.commit()
                LOGGER.info(f"Đã Punch In thành công {len(insert_data)} bản ghi.")
            except Exception:
                await session.rollback()
                raise

    except Exception as e:
        LOGGER.error(f"Lỗi Batch Punch In: {e}")
        raise


async def batch_punch_out(records: List[PunchCommand]) -> None:
    """
    Thực hiện Punch Out hàng loạt.
    
    Args:
        records: Danh sách `PunchCommand`, mỗi phần tử lấy timestamp
                 cuối cùng sau 17h30 của user.
        Cập nhật cả các session đang mở VÀ đã đóng (bản ghi mới nhất CÙNG NGÀY).
    """
    if not records:
        return

    emp_ids = [rec['emp_id'] for rec in records]
    
    # Lấy ngày từ record đầu tiên (giả sử tất cả records cùng ngày)
    # Chuyển sang múi giờ VN để lấy DATE
    first_time = records[0].get('time')
    if first_time.tzinfo is None:
        check_time_vn = VN_TZ.localize(first_time)
    else:
        check_time_vn = first_time.astimezone(VN_TZ)
    
    # Lấy DATE để so sánh (format: YYYY-MM-DD)
    check_date = check_time_vn.date()

    try:
        async with get_mysql_session() as session:
            try:
                # Tìm bản ghi MỚI NHẤT CÙNG NGÀY của mỗi employee
                find_query = text("""
                    SELECT ar1.id, ar1.employee_id, ar1.punch_out_utc_time
                    FROM ohrm_attendance_record ar1
                    INNER JOIN (
                        SELECT employee_id, MAX(id) as max_id
                        FROM ohrm_attendance_record
                        WHERE employee_id IN :emp_ids
                          AND DATE(punch_in_user_time) = :check_date
                        GROUP BY employee_id
                    ) ar2 ON ar1.employee_id = ar2.employee_id 
                         AND ar1.id = ar2.max_id
                """)
                find_query = find_query.bindparams(
                    bindparam('emp_ids', expanding=True),
                    bindparam('check_date', type_=Date)
                )
                
                result = await session.execute(find_query, {
                    "emp_ids": emp_ids,
                    "check_date": check_date
                })
                session_map = {
                    row.employee_id: {
                        'id': row.id,
                        'is_closed': row.punch_out_utc_time is not None
                    } 
                    for row in result
                }
                
                if not session_map:
                    LOGGER.warning(
                        f"Không tìm thấy bản ghi nào CÙNG NGÀY ({check_date}) để Punch Out."
                    )
                    return

                update_data = []
                skipped_count = 0
                first_punch_out = 0
                re_punch_out = 0
                
                for rec in records:
                    emp_id = rec['emp_id']
                    session_info = session_map.get(emp_id)
                    
                    if session_info:
                        utc_time, user_time = _prepare_time_data(rec.get('time'))
                        update_data.append({
                            "id": session_info['id'],
                            "utc_time": utc_time,
                            "user_time": user_time,
                            "note": rec.get('note') or ''
                        })
                        
                        # Đếm số lượng punch out lần đầu vs update lại
                        if session_info['is_closed']:
                            re_punch_out += 1
                        else:
                            first_punch_out += 1
                    else:
                        skipped_count += 1

                if update_data:
                    update_query = text("""
                        UPDATE ohrm_attendance_record
                        SET punch_out_utc_time = :utc_time,
                            punch_out_user_time = :user_time,
                            punch_out_time_offset = '7',
                            punch_out_timezone_name = 'Asia/Saigon',
                            punch_out_note = :note,
                            state = 'PUNCHED OUT'
                        WHERE id = :id
                    """)
                    
                    await session.execute(update_query, update_data)
                    await session.commit()
                    LOGGER.info(
                        f"Punch Out thành công {len(update_data)} bản ghi ngày {check_date} "
                        f"(Lần đầu: {first_punch_out}, Cập nhật lại: {re_punch_out}, "
                        f"Bỏ qua: {skipped_count})"
                    )
            except Exception:
                await session.rollback()
                raise

    except Exception as e:
        LOGGER.error(f"Lỗi Batch Punch Out: {e}")
        raise


async def update_punch_in_time(
    emp_id: int,
    target_date: date,
    new_time: datetime,
    note: str | None = None
) -> bool:
    """
    Cập nhật lại punch_in_time cho bản ghi của employee tại ngày cụ thể.
    
    Args:
        emp_id: OrangeHRM employee_id
        target_date: Ngày cần tìm bản ghi (date object hoặc datetime)
        new_time: Thời gian punch in mới (UTC hoặc timezone-aware)
        note: Ghi chú (optional), nếu None sẽ giữ nguyên note cũ
    
    Returns:
        bool: True nếu update thành công, False nếu không tìm thấy bản ghi
    
    Example:
        >>> from datetime import datetime, date
        >>> import pytz
        >>> vn_tz = pytz.timezone('Asia/Saigon')
        >>> 
        >>> # Sửa bản ghi ngày 3/12/2025
        >>> target = date(2025, 12, 3)
        >>> new_time = datetime(2025, 12, 3, 8, 0, 0, tzinfo=vn_tz)
        >>> await update_punch_in_time(
        ...     emp_id=21, 
        ...     target_date=target,
        ...     new_time=new_time, 
        ...     note="Sửa lại giờ"
        ... )
    """
    
    try:
        # Chuẩn hóa thời gian
        utc_time, user_time = _prepare_time_data(new_time)
        
        # Chuyển target_date thành date nếu là datetime
        if isinstance(target_date, datetime):
            target_date = target_date.date()
        
        async with get_mysql_session() as session:
            try:
                # Tìm bản ghi tại ngày cụ thể
                find_query = text("""
                    SELECT id, punch_in_note
                    FROM ohrm_attendance_record
                    WHERE employee_id = :emp_id
                      AND DATE(punch_in_user_time) = :target_date
                    ORDER BY id DESC
                    LIMIT 1
                """)
                
                result = await session.execute(find_query, {
                    "emp_id": emp_id,
                    "target_date": target_date
                })
                record = result.fetchone()
                
                if not record:
                    LOGGER.warning(
                        f"Không tìm thấy bản ghi ngày {target_date} "
                        f"cho employee_id={emp_id}"
                    )
                    return False
                
                # Chuẩn bị data update
                update_data = {
                    "id": record.id,
                    "utc_time": utc_time,
                    "user_time": user_time,
                    "note": note if note is not None else record.punch_in_note
                }
                
                # Update bản ghi
                update_query = text("""
                    UPDATE ohrm_attendance_record
                    SET punch_in_utc_time = :utc_time,
                        punch_in_user_time = :user_time,
                        punch_in_note = :note
                    WHERE id = :id
                """)
                
                await session.execute(update_query, update_data)
                await session.commit()
                
                LOGGER.info(
                    f"Đã cập nhật punch_in_time cho employee_id={emp_id}, "
                    f"ngày {target_date}, thời gian mới: {user_time}"
                )
                return True
                
            except Exception:
                await session.rollback()
                raise
                
    except Exception as e:
        LOGGER.error(f"Lỗi khi update punch_in_time: {e}")
        raise


async def update_punch_out_time(
    emp_id: int,
    target_date: date,
    new_time: datetime,
    note: str | None = None
) -> bool:
    """
    Cập nhật lại punch_out_time cho bản ghi của employee tại ngày cụ thể.
    
    Args:
        emp_id: OrangeHRM employee_id
        target_date: Ngày cần tìm bản ghi (date object hoặc datetime)
        new_time: Thời gian punch out mới (UTC hoặc timezone-aware)
        note: Ghi chú (optional), nếu None sẽ giữ nguyên note cũ
    
    Returns:
        bool: True nếu update thành công, False nếu không tìm thấy bản ghi
    
    Example:
        >>> target = date(2025, 12, 3)
        >>> new_time = datetime(2025, 12, 3, 18, 0, 0, tzinfo=vn_tz)
        >>> await update_punch_out_time(
        ...     emp_id=21,
        ...     target_date=target,
        ...     new_time=new_time,
        ...     note="Sửa lại giờ"
        ... )
    """
    
    try:
        # Chuẩn hóa thời gian
        utc_time, user_time = _prepare_time_data(new_time)
        
        # Chuyển target_date thành date nếu là datetime
        if isinstance(target_date, datetime):
            target_date = target_date.date()
        
        async with get_mysql_session() as session:
            try:
                # Tìm bản ghi tại ngày cụ thể
                find_query = text("""
                    SELECT id, punch_out_note
                    FROM ohrm_attendance_record
                    WHERE employee_id = :emp_id
                      AND DATE(punch_in_user_time) = :target_date
                    ORDER BY id DESC
                    LIMIT 1
                """)
                
                result = await session.execute(find_query, {
                    "emp_id": emp_id,
                    "target_date": target_date
                })
                record = result.fetchone()
                
                if not record:
                    LOGGER.warning(
                        f"Không tìm thấy bản ghi ngày {target_date} "
                        f"cho employee_id={emp_id}"
                    )
                    return False
                
                # Chuẩn bị data update
                update_data = {
                    "id": record.id,
                    "utc_time": utc_time,
                    "user_time": user_time,
                    "note": note if note is not None else record.punch_out_note
                }
                
                # Update bản ghi
                update_query = text("""
                    UPDATE ohrm_attendance_record
                    SET punch_out_utc_time = :utc_time,
                        punch_out_user_time = :user_time,
                        punch_out_note = :note,
                        state = 'PUNCHED OUT'
                    WHERE id = :id
                """)
                
                await session.execute(update_query, update_data)
                await session.commit()
                
                LOGGER.info(
                    f"Đã cập nhật punch_out_time cho employee_id={emp_id}, "
                    f"ngày {target_date}, thời gian mới: {user_time}"
                )
                return True
                
            except Exception:
                await session.rollback()
                raise
                
    except Exception as e:
        LOGGER.error(f"Lỗi khi update punch_out_time: {e}")
        raise


async def update_punch_times(
    emp_id: int,
    target_date: date,
    punch_in_time: datetime | None = None,
    punch_out_time: datetime | None = None,
    punch_in_note: str | None = None,
    punch_out_note: str | None = None
) -> bool:
    """
    Cập nhật cả punch_in và punch_out time cho bản ghi tại ngày cụ thể.
    
    Args:
        emp_id: OrangeHRM employee_id
        target_date: Ngày cần tìm bản ghi (date object hoặc datetime)
        punch_in_time: Thời gian punch in mới (optional)
        punch_out_time: Thời gian punch out mới (optional)
        punch_in_note: Ghi chú punch in (optional)
        punch_out_note: Ghi chú punch out (optional)
    
    Returns:
        bool: True nếu update thành công, False nếu không tìm thấy bản ghi
    
    Example:
        >>> target = date(2025, 12, 3)
        >>> in_time = datetime(2025, 12, 3, 8, 0, 0, tzinfo=vn_tz)
        >>> out_time = datetime(2025, 12, 3, 18, 0, 0, tzinfo=vn_tz)
        >>> await update_punch_times(
        ...     emp_id=21,
        ...     target_date=target,
        ...     punch_in_time=in_time,
        ...     punch_out_time=out_time,
        ...     punch_in_note="Sửa check-in",
        ...     punch_out_note="Sửa check-out"
        ... )
    """
    
    if punch_in_time is None and punch_out_time is None:
        LOGGER.warning("Không có thời gian nào để update!")
        return False
    
    # Chuyển target_date thành date nếu là datetime
    if isinstance(target_date, datetime):
        target_date = target_date.date()
    
    try:
        async with get_mysql_session() as session:
            try:
                # Tìm bản ghi tại ngày cụ thể
                find_query = text("""
                    SELECT id, punch_in_note, punch_out_note
                    FROM ohrm_attendance_record
                    WHERE employee_id = :emp_id
                      AND DATE(punch_in_user_time) = :target_date
                    ORDER BY id DESC
                    LIMIT 1
                """)
                
                result = await session.execute(find_query, {
                    "emp_id": emp_id,
                    "target_date": target_date
                })
                record = result.fetchone()
                
                if not record:
                    LOGGER.warning(
                        f"Không tìm thấy bản ghi ngày {target_date} "
                        f"cho employee_id={emp_id}"
                    )
                    return False
                
                # Chuẩn bị data update
                update_fields = []
                update_data = {"id": record.id}
                
                if punch_in_time is not None:
                    utc_in, user_in = _prepare_time_data(punch_in_time)
                    update_fields.append("punch_in_utc_time = :in_utc")
                    update_fields.append("punch_in_user_time = :in_user")
                    update_fields.append("punch_in_note = :in_note")
                    update_data["in_utc"] = utc_in
                    update_data["in_user"] = user_in
                    update_data["in_note"] = punch_in_note if punch_in_note is not None else record.punch_in_note
                
                if punch_out_time is not None:
                    utc_out, user_out = _prepare_time_data(punch_out_time)
                    update_fields.append("punch_out_utc_time = :out_utc")
                    update_fields.append("punch_out_user_time = :out_user")
                    update_fields.append("punch_out_note = :out_note")
                    update_fields.append("state = 'PUNCHED OUT'")
                    update_data["out_utc"] = utc_out
                    update_data["out_user"] = user_out
                    update_data["out_note"] = punch_out_note if punch_out_note is not None else record.punch_out_note
                
                # Build và execute query
                update_query = text(f"""
                    UPDATE ohrm_attendance_record
                    SET {', '.join(update_fields)}
                    WHERE id = :id
                """)
                
                await session.execute(update_query, update_data)
                await session.commit()
                
                LOGGER.info(
                    f"Đã cập nhật thời gian cho employee_id={emp_id}, ngày {target_date}"
                )
                return True
                
            except Exception:
                await session.rollback()
                raise
                
    except Exception as e:
        LOGGER.error(f"Lỗi khi update punch times: {e}")
        raise