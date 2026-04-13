from db.neo4j import driver
from core.kg import CurriculumKG

kg = CurriculumKG()


def push_kg_to_neo4j():
    with driver.session() as session:

        # Create Concept Nodes
        for cid, c in kg.concepts.items():
            session.run("""
                MERGE (c:Concept {id: $id})
                SET c.name = $name,
                    c.difficulty = $difficulty
            """,
            id=cid,
            name=c["name"],
            difficulty=c["difficulty"]
            )

        # Create Relationships
        for cid, c in kg.concepts.items():
            for pre in c["prerequisites"]:
                session.run("""
                    MATCH (a:Concept {id: $pre})
                    MATCH (b:Concept {id: $cid})
                    MERGE (a)-[:PREREQUISITE]->(b)
                """,
                pre=pre,
                cid=cid
                )