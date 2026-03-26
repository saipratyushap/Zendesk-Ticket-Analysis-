# Zendesk AI Persistence Dashboard 🚀🛡️✨

The **Zendesk AI Persistence Dashboard** is a premium, enterprise-grade intelligence engine designed to transform raw support tickets into actionable technical insights. Built for high-stakes client demonstrations, it leverages multi-modal AI (**Gemini**, **Groq/Llama**, and **xAI/Grok**) to automate root-cause analysis and strategic resolution planning.

---

## 🌟 Key Features

### 🧠 1. Multi-Model Intelligence (Chain of Thought)
- **Primary Analysis (Gemini 2.0 Flash)**: Deep logical processing to identify true root causes and technical categories.
- **Failover Support (Groq/Grok)**: High-performance fallbacks ensure 100% uptime for critical demo environments.
- **Strategic Roadmaps**: Even for vague tickets, the AI extrapolates professional action plans based on industry best practices (e.g., PLC stability, signal-to-noise verification).

### ⚙️ 2. Intelligent AI Pipeline
- **Auto-Ingestion API**: Integrated endpoints (`/api/tickets/close`) allow external systems to inject tickets for immediate, synchronous enrichment.
- **70% Confidence Guardrail**: 
  - **Auto-Closed**: Tickets with ≥70% confidence are synced directly as high-quality training data.
  - **Manual Audit**: Tickets with <70% confidence are routed to **Outstanding Tickets** for human verification.
- **Deep Data Cleanup**: Automated removal of signatures, footers, and technical headers before processing.

### 📊 3. Precision KPI Dashboard
- **Intelligence Score**: Tracks the average confidence of the AI's results across the fleet.
- **Urgent (Critical)**: Real-time counter for high-impact, critical-priority incidents.
- **Problem Distribution**: Professional visualizations for category breakdowns and top impacting accounts.

---

## 🏷️ Automated Taxonomy
The engine automatically classifies every ticket across the following dimensions:
- **Issue Category**: Broad technical domain (e.g., Sensors & PLC Connectivity, Systems Reliability).
- **Severity**: Criticality levels (CRITICAL, HIGH, MEDIUM, LOW) based on impact and sentiment.
- **Resolution Type**: Classification of the final solution (e.g., Device Migration, Configuration Bug).
- **Stakeholders**: AI-identified departments impacted by the issue (Finance, Engineering, etc.).

---

## 🏗️ Architecture & Tech Stack
- **Frontend**: [React (Vite 5)](file:///Users/psaipratyusha/Library/Mobile%20Documents/com~apple~CloudDocs/Zendesk%205/frontend-react) - Running on **Port 5174**.
- **Backend**: [Flask (Python 3.10+)](file:///Users/psaipratyusha/Library/Mobile%20Documents/com~apple~CloudDocs/Zendesk%205/backend) - Running on **Port 5001/5003**.
- **Database**: SQLite (`database.sqlite`) with support for MySQL production mirrors.
- **AI Stack**: Gemini 2.0 Flash (Primary) → Groq Llama 3.3 (Secondary) → Keyword Heuristics (Fallback).

---

## 🚀 Getting Started

### 1. Backend Setup
1. Navigate to `backend/`.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python3 app.py
   ```

### 2. Frontend Setup
1. Navigate to `frontend-react/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev -- --port 5174
   ```

---

## 📂 API Reference (Simulation)

### Process External Ticket
```bash
curl -X POST http://localhost:5001/api/tickets/close \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": 412,
    "title": "Device Connectivity Issue",
    "description": "Customer reporting intermittent signal on Duo 74a434b...",
    "status": "closed"
  }'
```

---

Developed with 💎 by **Thirdeyedata**.
