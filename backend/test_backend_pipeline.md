# 📄 2. `testing_pipeline.md`

```md
# Dynamic Knowledge Graph Testing Guide

This document explains how to test the full adaptive learning pipeline.

---

## 🎯 Objective

Validate the complete system flow:


User → Assessment → Score → Roadmap → Interview → Update → Dynamic KG


---

## ⚙️ Prerequisites

Before testing, ensure:

- MongoDB Atlas is connected
- Neo4j Aura is running
- `.env` is configured correctly
- Backend server is running

---

## 🚀 1. Start Backend Server

```bash
uvicorn main:app --reload

Open:

http://127.0.0.1:8000/docs
🧪 2. Create User
POST /user/create
{
  "name": "test_user",
  "email": "test@example.com"
}
✅ Output
{
  "user_id": "generated-uuid"
}

Save user_id.

🧪 3. Get Initial Roadmap
GET /plan/{learner_id}
Example:
/plan/<user_id>
✅ Output
{
  "steps": [
    {
      "concept_id": "variables"
    }
  ]
}
🧪 4. Fetch Interview Questions
GET /interview/questions/{concept_id}
/interview/questions/variables
✅ Output
{
  "questions": [...]
}
🧪 5. Submit Interview Answers
POST /interview/evaluate
{
  "learner_id": "<user_id>",
  "concept_id": "variables",
  "answers": [
    {
      "question_id": "var_1",
      "answer": "A variable is a named memory location used to store data."
    }
  ]
}
🧪 6. Check Updated Roadmap
GET /plan/{learner_id}
✅ Expected
{
  "steps": [
    {
      "concept_id": "arrays"
    }
  ]
}
🧪 7. Verify Dynamic KG (Neo4j)

Run in Neo4j:

MATCH (u:User)-[:LEARNING]->(c)
RETURN u, c
MATCH (u:User)-[:NEXT]->(c)
RETURN u, c
✅ Expected Behavior
User node exists
LEARNING relationships exist
NEXT relationships update dynamically
🔄 8. Test Weak Performance Scenario
POST /learner/mastery/update
{
  "learner_id": "<user_id>",
  "concept_id": "arrays",
  "score": 0.3
}
Expected:
No progression
Review triggered
⚠️ Common Mistakes
❌ Wrong question_id

Use actual IDs like:

var_1, var_2
❌ Missing questions in bank

Ensure all KG concepts exist in question bank

❌ ObjectId serialization error

Convert Mongo _id to string or remove it

❌ Neo4j not updating

Ensure:

Sync function is called
Neo4j connection is active
🧠 Expected System Behavior
Strong Performance
variables → strong → arrays unlocked
Weak Performance
arrays → weak → review triggered
🎯 Final Outcome

The system should:

Adapt roadmap dynamically
Update Neo4j graph per user
Maintain personalized learning path
🚀 Summary

You have successfully tested:

User creation
Assessment system
Scoring engine
Roadmap generation
Dynamic knowledge graph updates