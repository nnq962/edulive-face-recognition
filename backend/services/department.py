# backend/services/department.py

from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.schemas.department import DepartmentCreate
from backend.models.department import DepartmentModel
from utils import LOGGER
from utils.common import normalize_mongo_doc
from bson import ObjectId

DEPARTMENT_COLLECTION = "departments"
USER_COLLECTION = "users"


async def create_department(db: AsyncIOMotorDatabase, department_data: DepartmentCreate) -> dict:
    """
    Tạo department mới
    
    Args:
        db: Database instance
        department_data: Dữ liệu department từ request
    
    Returns:
        dict: Department document vừa được tạo
    """
    try:
        departments_collection = db[DEPARTMENT_COLLECTION]

        # 1. Kiểm tra trùng tên (case-insensitive)
        existing = await departments_collection.find_one({
            "name": {"$regex": f"^{department_data.name}$", "$options": "i"}
        })
        if existing:
            raise ValueError(f"Department '{department_data.name}' already exists")

        # 2. Tạo document
        new_department = DepartmentModel(name=department_data.name)

        # 3. Lưu vào DB
        result = await departments_collection.insert_one(new_department.model_dump())

        # 4. Lấy lại document vừa tạo (để trả về)
        created = await departments_collection.find_one({"_id": result.inserted_id})
        created["_id"] = str(created["_id"])  # convert ObjectId -> string

        LOGGER.info(f"Created department '{department_data.name}' successfully")

        return created

    except Exception as e:
        LOGGER.error(f"Error creating department: {e}")
        raise


async def get_departments(
    db: AsyncIOMotorDatabase,
    page: int = 1,
    limit: int = 20,
    sort: str = "created_at",
    order: str = "desc",
    search: str | None = None
) -> tuple[list[dict], int]:
    """
    Lấy danh sách departments với pagination và tìm kiếm
    
    Args:
        db: Database instance
        page: Trang hiện tại
        limit: Số items mỗi trang
        sort: Trường để sắp xếp
        order: Thứ tự sắp xếp (asc/desc)
        search: Tìm kiếm theo tên
    
    Returns:
        tuple: (list of departments, total count)
    """
    try:
        departments_collection = db[DEPARTMENT_COLLECTION]
        
        # Build query
        query = {}
        if search:
            query["name"] = {"$regex": search, "$options": "i"}  # Case-insensitive search
        
        LOGGER.debug(f"Query: {query}")
        LOGGER.debug(f"Pagination: page={page}, limit={limit}, sort={sort}, order={order}")
        
        # Get total count
        total = await departments_collection.count_documents(query)
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Sort direction
        sort_direction = 1 if order == "asc" else -1
        
        # Get departments với pagination và sorting
        cursor = departments_collection.find(query).sort(
            sort, 
            sort_direction
        ).skip(skip).limit(limit)
        
        departments = await cursor.to_list(length=None)
        
        # Normalize documents
        normalized_departments = [normalize_mongo_doc(dept) for dept in departments]
        
        LOGGER.info(f"Fetched {len(normalized_departments)} departments (total: {total})")
        
        return normalized_departments, total
        
    except Exception as e:
        LOGGER.error(f"Error fetching departments: {e}")
        raise


async def delete_department(db: AsyncIOMotorDatabase, department_id: str) -> dict:
    """
    Xóa department theo ID (và kiểm tra xem có user nào đang thuộc phòng đó không)

    Args:
        db: Database instance
        department_id: ID của phòng ban cần xóa

    Returns:
        dict: Thông tin phòng ban vừa bị xóa (id, name)

    Raises:
        ValueError: Nếu phòng ban không tồn tại hoặc đang được dùng
    """
    try:
        departments_collection = db[DEPARTMENT_COLLECTION]
        users_collection = db[USER_COLLECTION]

        # 1. Kiểm tra id hợp lệ
        try:
            object_id = ObjectId(department_id)
        except Exception:
            raise ValueError("Invalid department ID format")

        # 2. Kiểm tra phòng ban tồn tại
        department = await departments_collection.find_one({"_id": object_id})
        if not department:
            raise ValueError("Department not found")

        # 3. Kiểm tra có user nào đang thuộc phòng ban này không
        user_in_department = await users_collection.find_one({"department": department["name"]})
        if user_in_department:
            raise ValueError(f"Cannot delete department '{department['name']}' — it is assigned to existing users")

        # 4. Xóa phòng ban
        result = await departments_collection.delete_one({"_id": object_id})
        if result.deleted_count == 0:
            raise ValueError("Failed to delete department")

        LOGGER.info(f"Deleted department: {department['name']} ({department_id})")

        return {
            "id": str(department["_id"]),
            "name": department["name"]
        }

    except ValueError:
        raise
    except Exception as e:
        LOGGER.error(f"Error deleting department {department_id}: {e}")
        raise


async def update_department(db: AsyncIOMotorDatabase, department_id: str, new_name: str) -> dict:
    """
    Cập nhật tên phòng ban theo ID

    Args:
        db: Database instance
        department_id: ID của phòng ban cần sửa
        new_name: Tên mới của phòng ban

    Returns:
        dict: Thông tin phòng ban sau khi sửa

    Raises:
        ValueError: Nếu không tồn tại hoặc trùng tên
    """
    try:
        departments_collection = db[DEPARTMENT_COLLECTION]
        users_collection = db[USER_COLLECTION]

        # 1. Kiểm tra ID hợp lệ
        try:
            object_id = ObjectId(department_id)
        except Exception:
            raise ValueError("Invalid department ID format")

        # 2. Kiểm tra phòng ban có tồn tại không
        existing = await departments_collection.find_one({"_id": object_id})
        if not existing:
            raise ValueError("Department not found")

        # 3. Kiểm tra trùng tên (case-insensitive, bỏ qua chính nó)
        duplicate = await departments_collection.find_one({
            "name": {"$regex": f"^{new_name}$", "$options": "i"},
            "_id": {"$ne": object_id}
        })
        if duplicate:
            raise ValueError(f"Department '{new_name}' already exists")

        # 4. Cập nhật tên trong bảng users nếu họ thuộc phòng ban cũ
        old_name = existing["name"]
        await users_collection.update_many(
            {"department": old_name},
            {"$set": {"department": new_name}}
        )

        # 5. Cập nhật document department
        result = await departments_collection.update_one(
            {"_id": object_id},
            {"$set": {"name": new_name}}
        )

        if result.modified_count == 0:
            raise ValueError("No changes were made")

        LOGGER.info(f"Updated department '{old_name}' → '{new_name}'")

        return {
            "id": str(existing["_id"]),
            "name": new_name
        }

    except ValueError:
        raise
    except Exception as e:
        LOGGER.error(f"Error updating department {department_id}: {e}")
        raise