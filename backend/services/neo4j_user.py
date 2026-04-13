# services/neo4j_user.py
from db.neo4j import driver

def create_user_node(user_id):
    with driver.session() as session:
        session.run("""
            MERGE (u:User {id: $user_id})
        """, user_id=user_id)