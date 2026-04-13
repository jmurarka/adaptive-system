# 🐞 Bugs & Issues Log

---

## ❗ Bug: Duplicate `learner_state` Entries for Same User

### 📍 Description

Multiple documents are being created in the `learner_state` collection for the same `user_id`.

Instead of maintaining a **single learner state per user**, the system is inserting **new documents on each update**, leading to duplicated records.

---

### 🧪 Observed Behavior

In MongoDB:

- Multiple documents exist with the same `user_id`
- Each document contains partial or repeated concept mastery data

Example:


user_id: 2b88fa06-8ce0-4a5a-84c1-45f02674d68a


Appears in multiple documents with different `_id` values.

---

### 📸 Evidence

- `learner_state` collection shows multiple entries for same user
- Each entry has a different `_id` but same `user_id`
- Concept mastery is fragmented across documents

---

### ❌ Expected Behavior

There should be:


ONE user_id → ONE learner_state document


The document should:

- Store all concept mastery scores
- Be updated incrementally
- Persist user learning progress in a single place

---

### 🧠 Root Cause

The system is using:

```python
insert_one()

Instead of:

update_one(..., upsert=True)

👉 This causes:

New document creation every time
No aggregation of user progress
🔥 Impact
Data inconsistency
Broken learning state tracking
Neo4j sync may use outdated or partial data
Dynamic KG becomes unreliable
✅ Fix

Replace insert logic with upsert-based update

learner_collection.update_one(
    {"user_id": user_id},
    {
        "$set": {
            f"concepts.{concept_id}": {
                "score": score,
                "last_updated": datetime.utcnow().isoformat()
            }
        }
    },
    upsert=True
)
⚠️ Additional Recommendation
Add unique index on user_id
learner_collection.create_index("user_id", unique=True)

👉 Prevents duplicate documents at DB level

🧪 Validation After Fix
Only one document exists per user_id
Concept scores update inside same document
No duplicate _id entries
Neo4j sync reflects correct user state
🎯 Status
 Identified
 Fix implemented
 Verified
🧠 Notes

This bug directly affects:

Personalization engine
Knowledge graph updates
Roadmap generation accuracy

Fixing this is critical for system correctness.