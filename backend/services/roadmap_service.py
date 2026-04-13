from db.neo4j import driver


def get_next_concepts(user_id, concept_id):
    with driver.session() as session:
        result = session.run("""
            MATCH (u:User {id: $user_id})-[r:LEARNING]->(c:Concept {id: $cid})
            WHERE r.mastery = "strong"

            MATCH (c)<-[:PREREQUISITE]-(next:Concept)
            RETURN next.id AS id, next.name AS name
        """,
        user_id=user_id,
        cid=concept_id
        )

        return [record.data() for record in result]


def update_next_edges(user_id, next_concepts):
    with driver.session() as session:
        for concept in next_concepts:
            session.run("""
                MATCH (u:User {id: $user_id})
                MATCH (c:Concept {id: $cid})

                MERGE (u)-[:NEXT]->(c)
            """,
            user_id=user_id,
            cid=concept["id"]
            )


def handle_mastery_update(user_id, concept_id):
    next_concepts = get_next_concepts(user_id, concept_id)
    update_next_edges(user_id, next_concepts)