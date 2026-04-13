from db.mongo import learner_collection
from core.kg import CurriculumKG

kg = CurriculumKG()


def create_learner_state(user_id: str):
    concept_ids = kg.all_concept_ids()

    learner_doc = {
        "user_id": user_id,
        "concepts": {
            cid: {
                "score": 0.0,
                "mastery": "unknown",
                "attempts": 0,
                "history": []
            } for cid in concept_ids
        }
    }

    learner_collection.insert_one(learner_doc)
    return learner_doc


def update_concept(user_id, concept_id, score, mastery):
    learner_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                f"concepts.{concept_id}.score": score,
                f"concepts.{concept_id}.mastery": mastery
            },
            "$inc": {
                f"concepts.{concept_id}.attempts": 1
            }
        }
    )