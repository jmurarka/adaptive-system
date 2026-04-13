from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI not set")

client = MongoClient(MONGO_URI)

db = client["adaptive_learning"]

users_collection = db["users"]
learner_collection = db["learner_state"]

print("MongoDB connected successfully")