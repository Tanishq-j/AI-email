# 🌌 SoMailer Intelligence Hub  
*The Open-Source, Agentic AI Email Management Ecosystem*

![SoMailer Banner](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge) ![Python](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python&logoColor=white) ![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/Postgres-PgVector-336791?style=for-the-badge&logo=postgresql&logoColor=white) 

SoMailer is a locally-hosted, highly-advanced, multi-agent AI Email Assistant. It transcends basic auto-responders by establishing an end-to-end event-driven loop capable of classifying incoming signals, executing intelligent RAG operations over company constraints, drafting personalized replies, and automatically pinging secondary platforms (Google Calendar, Slack, Twilio) upon detecting urgent communications or meeting requests.

---

## 🏗 System Architecture

The ecosystem relies on an intricate, multi-layered architecture working concurrently:

1. **Automation Layer (n8n)**: Acts as the primary ingress/egress. Ingests raw emails in real-time, packages them inside JSON payloads, and eventually executes backend outbound commands (Drafting via Gmail, Escalations to Slack, etc.) 
2. **Execution & Routing Layer (FastAPI)**: Serves as the high-throughput bridge connecting your front end (Dashboard) and automation loops (n8n).
3. **Agentic Layer (LangGraph & Groq)**: Employs **Llama-3.3-70B** via the Groq API as the brain. Tasks are broken down across specific Nodes:
   * **Classifier Node**: Chain-of-Thought (CoT) logic to assign immediate states (`Urgent_Fire`, `Scheduling`, `FYI_Read`, `Action_Required`, `Cold_Outreach`).
   * **Researcher Node (RAG)**: Leverages `sentence-transformers` locally to calculate cosine similarity via `PgVector`, automatically injecting active company knowledge/constraints into its working state memory. 
   * **Planner Node**: Constructs the exact actions out of the parsed classifications.
   * **Identity Node**: Adapts the response text to mirror the user's specific tone configurations.
4. **Data & Vector Layer (PostgreSQL)**: Handles persistent tabular storage as well as 384-dimensional mathematical arrays mapping vector distance. 
5. **Presentation Layer (React + Vite)**: A premium, animated GUI built with `Framer Motion` and `Lucide` displaying predictive analytics, recent intelligence signals, and a localized AI configuration interface.

---

## 🌍 Directory Structure

```bash
📦 AI-Email-Solution
 ┣ 📂 backend/              # Python FastAPI, Agent Nodes, Vector operations
 ┃ ┣ 📂 app/                # LangGraph matrices & API Routers
 ┃ ┣ 📜 main.py             # FastAPI entrypoint
 ┃ ┣ 📜 seed_rag.py         # PgVector Table mapping & Dimension Generator
 ┃ ┣ 📜 requirements.txt    # Heavyweight python dependencies (torch, transformers)
 ┃ ┗ 📜 .env                # Core configuration block (API keys)
 ┣ 📂 frontend/             # React (Vite) App Dashboard
 ┃ ┣ 📂 src/                # Components, Routing & Hooks
 ┃ ┗ 📜 package.json        
 ┣ 📂 n8n/                  # Exported Workflow JSON Schemas
 ┃ ┗ 📜 Migration Workflow.json
 ┣ 📂 testing files/        # Isolated mock generators & diagnostic scripts
 ┃ ┣ 📜 testing_guide.txt   # Master inventory explaining each test script
 ┃ ┣ 📜 test_rag.py         # ...and other environment validation tools
 ┗ 📜 docker-compose.yml    # Rapid infrastructure spin-up
```

---

## 🚀 Setup Guide & Installation

Follow these instructions strictly to get the entire intelligence environment running locally. 

### Step 1: Minimum Prerequisites
Ensure your machine natively has:
- **Docker & Docker Compose** (Crucial for isolated environments)
- **Python 3.11+**
- **Node.js (v18+)**
- A **Groq API Key** (Free tier works flawlessly for inferences)

### Step 2: Infrastructure Spin-Up
Before initiating code, we must construct the data clusters.

```bash
# Bring up PostgreSQL (PgVector enabled), Redis, and n8n simultaneously
docker-compose up -d
```
*Verify success via `docker ps`. You should see `db-1` (5432) and `n8ncontainer` (5678) actively running.*

### Step 3: Backend Preparation
Open a terminal in the `/backend` directory.

```bash
# 1. Create a pristine virtual environment
python -m venv venv

# 2. Activate it (Windows)
.\venv\Scripts\activate
# (Mac/Linux users: source venv/bin/activate)

# 3. Retrieve Dependencies (Note: The extraction for CPU Torch takes time)
pip install -r requirements.txt
pip install sentence-transformers
```

**Establish your `.env`**:
Create a `.env` file directly under `/backend` with the following variables:
```env
GROQ_API_KEY="your_real_groq_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"
DATABASE_URL="postgresql://user:password@localhost:5432/email_intelligence"
REDIS_URL="redis://localhost:6379/0"
```

### Step 4: Semantic Initialization (RAG Vectorizing)
In order for the AI brain to calculate dynamic routing scores, we have to inject standard policy embeddings into the offline CPU framework. 

```bash
# Make sure you are still inside the /backend directory
python seed_rag.py
```
*(This command will autonomously download standard inference weights, forge out the pgvector scheme, wipe any bad dimension matrices, and insert the constraint dictionaries at exactly `vector(384)` dimensionality).*

### Step 5: Boot the Hubs
You need two separate terminal windows for this.

**Terminal A (Backend)**:
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal B (Frontend)**:
```bash
cd frontend
npm install
npm run dev
```

### Step 6: Initializing n8n Automation
1. Navigate to your local n8n instance at `http://localhost:5678` and establish a master credential.
2. In the n8n UI, navigate to Workflows -> Import from File.
3. Import the `n8n/Migration Workflow.json` present in this repository. 
4. **Aesthetic Check**: The workflow natively sends POST demands across your bridge towards `http://host.docker.internal:8000/process-email`. Make sure you "Activate" the workflow!

---

## 🎯 Usage & Testing the Stack

If you want to trigger the logic flow securely without pushing a real automated email yet, you can use the built-in testing scripts:

1. Inside `/backend`, ensure `test_action_flows.py` and `test_rag.py` are present. 
2. Execute `python test_rag.py`. 
3. Watch the terminal natively execute a CoT Graph traversal. You will see the AI calculate cosine similarity values up to `.49%` indicating the PgVector and Groq systems are speaking seamlessly. 

---

### 🎉 Congratulations, your local AI Email Operator is active!
