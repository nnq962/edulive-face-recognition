from config.database import connect_to_mysql, close_mysql_connection
from sqlalchemy import text
from datetime import datetime
import pytz
import asyncio
from backend.utils.ohrm_helpers import (
    get_employee_ids,
    batch_punch_in,
    batch_punch_out,
    PunchCommand
)

# --- CÁCH SỬ DỤNG ---
async def main():
    await connect_to_mysql()
    
    try:
        # Gọi riêng lẻ punch out cho dungla@edulive.net
        test_records: list[PunchCommand] = [
            {
                "emp_id": 21,  # dungla@edulive.net
                "time": datetime(2025, 12, 3, 18, 30, 0, tzinfo=pytz.timezone('Asia/Saigon')),  # Thời gian bất kỳ
                "note": "Punch out thủ công cho Dũng"
            }
        ]
        
        print("Đang punch out cho dungla@edulive.net...")
        await batch_punch_out(test_records)
        print("✅ Punch out thành công!")
        
    finally:
        await close_mysql_connection()


if __name__ == "__main__":
    asyncio.run(main())