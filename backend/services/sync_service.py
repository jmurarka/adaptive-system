from db.mongo import learner_collection
from db.neo4j import driver


def create_user_node(user_id):
    with driver.session() as session:
        session.run("""
            MERGE (u:User {id: $user_id})
        """, user_id=user_id)


def sync_user_to_neo4j(user_id):
    learner = learner_collection.find_one({"user_id": user_id})

    if not learner:
        return

    with driver.session() as session:
        for cid, data in learner["concepts"].items():

            session.run("""
                MATCH (u:User {id: $user_id})
                MATCH (c:Concept {id: $cid})

                MERGE (u)-[r:LEARNING]->(c)
                SET r.score = $score,
                    r.mastery = $mastery,
                    r.attempts = $attempts
            """,
            user_id=user_id,
            cid=cid,
            score=data["score"],
            mastery=data["mastery"],
            attempts=data["attempts"]
            )