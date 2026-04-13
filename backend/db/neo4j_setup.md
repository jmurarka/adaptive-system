# Database Setup Guide

This document explains how to set up **Neo4j (Aura Cloud)** for the Adaptive Learning System.

---

## 🚀 1. Create Neo4j Aura Instance

1. Go to: https://console.neo4j.io  
2. Sign in / create an account  
3. Click **Create Instance**  
4. Choose:
   - Plan: **AuraDB Free**
5. Wait until the instance status becomes:


# Running


---

## 🔑 2. Get Connection Details

From the Aura dashboard:

- Open your instance  
- Click **Connection Details**

# Copy the credentials:
NEO4J_URI=neo4j+s://<your-id>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-password>


---

## ⚙️ 3. Configure Environment Variables

Create a `.env` file inside:

backend/.env

Add the following:

```env
NEO4J_URI=neo4j+s://<your-id>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-password>
```
---

# 4. Install Dependencies
pip install neo4j python-dotenv
# 5. Setup Neo4j Connection
Create the file:

backend/db/neo4j.py

Add:
```
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

print("DEBUG NEO4J_URI:", NEO4J_URI)

if not NEO4J_URI:
    raise ValueError("NEO4J_URI not set")

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD)
)
```
# ⚠️ Important Rules
❌ Do NOT use:
encrypted=True
ssl_context=...
trust=...
❌ Do NOT use:
bolt://localhost:7687
✅ Always use:
neo4j+s://...

#  6. Test Connection
## important:necesarily use hotspot because:
---

### 🧠 Root Cause

Neo4j Aura requires:

- Secure connection (SSL/TLS)
- Open port `7687` (Bolt protocol)
- Proper DNS resolution

The Wi-Fi network was interfering with one or more of these requirements.

---

### 🔴 Issues with Wi-Fi Network

#### 1. Blocked Ports
Many institutional or restricted networks block non-standard ports.

Neo4j uses:

Port 7687 (Bolt protocol)


Typical networks only allow:
- 80 (HTTP)
- 443 (HTTPS)

Result: Connection refused or timed out.

---

#### 2. Firewall / Proxy Interference
Some networks use firewalls or proxies that:

- Intercept SSL traffic
- Replace certificates with self-signed ones

This caused errors like:

SSLCertVerificationError: self signed certificate in certificate chain


---

#### 3. DNS Resolution Failure

The network failed to resolve Neo4j Aura domain:


*.databases.neo4j.io


Error observed:

getaddrinfo failed


---

#### 4. IPv6 Routing Issues

The system attempted IPv6 connections which failed:


IPv6 timeout / connection aborted


---

### ✅ Why Mobile Hotspot Worked

Mobile hotspot provided:

- No firewall restrictions
- No proxy interference
- Clean DNS resolution
- Proper SSL certificate handling

Result:

Successful connection to Neo4j Aura


---

### 🎯 Key Takeaway

The issue was **not related to code or configuration**, but due to **network-level restrictions**.

---

### 🚀 Recommendation

If facing similar issues:

- Use a mobile hotspot for development
- Avoid restricted networks (college/office Wi-Fi)
- Use VPN if hotspot is not available

---

## Open Python:
python
Run:
```
from db.neo4j import driver

with driver.session() as session:
    print(session.run("RETURN 1").single())
```
✅ Expected Output:
{'1': 1}

# 📊 7. Push Knowledge Graph[use hotspot]
from services.kg_sync import push_kg_to_neo4j
push_kg_to_neo4j()
[to proceed you must have already configured the mongodb setup]
# 🔍 8. Verify in Neo4j Aura
Open the Query tab and run:
MATCH (c:Concept) RETURN c LIMIT 10
Check relationships:

MATCH (a)-[r:PREREQUISITE]->(b)
RETURN a, r, b LIMIT 10
🛠️ 9. Common Errors & Fixes
🔴 NEO4J_URI is None
.env not loaded
incorrect file path
🔴 ConfigurationError (ssl/encrypted)
remove extra driver config
use only:
GraphDatabase.driver(uri, auth=...)
🔴 SSL CERTIFICATE FAILED
switch to mobile hotspot
or use a different network
🔴 Unable to retrieve routing information
Aura instance not running
wait 30–60 seconds
🔴 DNS resolve failed
unstable network
try hotspot or VPN
🧠 10. Architecture
FastAPI Backend
     ↓
MongoDB (user data)
     ↓
Neo4j Aura (knowledge graph)
✅ Final Result

After setup:

Concepts stored as nodes
Prerequisites stored as relationships
User-specific dynamic graph enabled
🎯 Summary

Neo4j Aura is used to:

Store curriculum graph
Track user learning relationships
Dynamically update roadmap