from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
from pathlib import Path
import certifi
import ssl

# 🔥 FORCE CORRECT PATH
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

print("DEBUG NEO4J_URI:", NEO4J_URI)  # 🔥 MUST PRINT VALUE

if not NEO4J_URI:
    raise ValueError("NEO4J_URI is not set. Check your .env file.")
ssl_context = ssl.create_default_context(cafile=certifi.where())
driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD),
    # encrypted=True,
    # trust="TRUST_ALL_CERTIFICATES"
    # ssl_context = ssl_context
)


# # db/neo4j.py
# from neo4j import GraphDatabase
# import os

# NEO4J_URI = os.getenv("NEO4J_URI")
# NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
# NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# # driver = GraphDatabase.driver(
# #     NEO4J_URI,
# #     auth=(NEO4J_USER, NEO4J_PASSWORD)
# # )
# driver = GraphDatabase.driver(
#     NEO4J_URI,
#     auth=(NEO4J_USER, NEO4J_PASSWORD),
#     encrypted=True,
#     trust="TRUST_ALL_CERTIFICATES"   # 🔥 FIX
# )