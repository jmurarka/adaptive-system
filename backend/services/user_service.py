# services/user_service.py
from db.mongo import users_collection
import uuid
import datetime

# def create_user(name, email):
#     user = {
#         "user_id": str(uuid.uuid4()),
#         "name": name,
#         "email": email,
#         "created_at": None
#     }

#     users_collection.insert_one(user)
#     return user
def create_user(name: str, email: str):
    user = {
        "user_id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "created_at": datetime.datetime.utcnow().isoformat()
    }

    result = users_collection.insert_one(user)

    # 🔥 Convert ObjectId to string
    user["_id"] = str(result.inserted_id)

    return user