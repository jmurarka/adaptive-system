📄 1. mongo_setup.md
# MongoDB Setup Guide (MongoDB Atlas)

This document explains how to set up MongoDB using MongoDB Atlas (cloud) for the Adaptive Learning System.

---

## 🚀 1. Create MongoDB Atlas Cluster

1. Go to: https://cloud.mongodb.com  
2. Sign in / create an account  
3. Click **Create Cluster**
4. Choose:
   - **Free Tier (M0)**
5. Select a region close to your location
6. Click **Create**

Wait until the cluster status becomes:


Ready


---

## 🔐 2. Create Database User

1. Go to **Database Access**
2. Add a new user:


Username: admin
Password: <your-password>


3. Save credentials

---

## 🌐 3. Configure Network Access

1. Go to **Network Access**
2. Click **Add IP Address**
3. Add:


0.0.0.0/0


This allows access from any IP (useful for development)

---

## 🔗 4. Get Connection String

1. Go to **Clusters → Connect → Drivers**
2. Copy connection string:


mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority


---

## ⚙️ 5. Configure Environment Variables

Create `.env` inside:


backend/.env


Add:

```env
MONGO_URI=mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/adaptive_learning?retryWrites=true&w=majority
```
# 📦 6. Install Dependencies
pip install pymongo python-dotenv
# 🔌 7. Setup MongoDB Connection
file created just run the following commands to test the connection:
Open Python in terminal:

python

Run:

from db.mongo import users_collection

users_collection.insert_one({"test": "mongo working"})
print("Inserted successfully")

# 🔍 9. Verify in MongoDB Atlas

Go to:

Browse Collections

You should see:

adaptive_learning
  ├── users
  ├── learner_state
⚠️ Do’s and Don’ts
✅ Do’s
Use MongoDB Atlas (cloud) instead of local MongoDB
Store sensitive data in .env
Use a custom user_id (UUID) instead of Mongo _id
Validate environment variables before connecting
Keep collections structured (users, learner_state)
❌ Don’ts
Do NOT expose your MongoDB password in code
Do NOT rely on Mongo _id for application logic
Do NOT skip Network Access configuration
Do NOT hardcode connection strings
Do NOT mix local MongoDB and Atlas unintentionally
🧠 Summary

MongoDB is used to store:

User details
Learning progress
Concept scores and history