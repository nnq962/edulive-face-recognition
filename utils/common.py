def normalize_mongo_doc(doc: dict) -> dict:
    """
    Chuẩn hóa document MongoDB:
    - Chuyển _id → id (string)
    - Xóa _id gốc
    - Bỏ password nếu có
    """
    if not doc:
        return doc

    doc = doc.copy()  # tránh ảnh hưởng đến object gốc

    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]

    # Xóa password nếu có
    doc.pop("password", None)

    return doc