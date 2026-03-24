# Zendesk AI Persistence Dashboard 🚀🛡️✨

The **Zendesk AI Persistence Dashboard** is a premium, enterprise-grade intelligence engine designed to transform raw support tickets into actionable technical insights. Built for high-stakes client demonstrations, it leverages **Gemini 2.0 (Chain of Thought)** to automate root-cause analysis and strategic resolution planning.

---

## 🌟 Key Features

### 🧠 1. Gemini 2.0 Intelligence (State-of-the-Art)
- **Chain-of-Thought Reasoning**: Every ticket is analyzed with deep logical steps to identify the *true* root cause, not just the symptom.
- **Strategic Roadmaps (Rule 8)**: Even for vague tickets, the AI extrapolates a **Professional Strategic Roadmap** based on industry best practices (e.g., MQTT stability checks, signal-to-noise verification).
- **High-Contrast Design**: A premium, black-and-white, large-typography interface optimized for high-visibility client presentations.

### ⚙️ 2. API-Driven Ingestion Flow
- **Auto-Ingestion API**: Integrated endpoints (`/api/tickets/close`) allow external systems to inject closed tickets for immediate, synchronous AI enrichment.
- **70% Confidence Guardrail**: Tickets with <70% AI confidence are automatically routed to **Pending Review**, while high-confidence insights are instantly synced.
- **Professional Fallbacks**: If a company name is missing, the system rotates through a prestige client list (**Royal VIVBuisman**, **Novo Nordisk**, **Convatec**) to maintain demo consistency.

### 📊 3. Precision KPI Analytics
- **Processed vs. Pending**: Real-time tracking of AI-verified tickets versus those requiring human intervention.
- **Problem Clusters**: Direct count of unique technical failure patterns across your entire fleet.
- **Dynamic Charts**: Interactive trend mapping for category distribution and ticket volume.

---

## 🏷️ Automated Taxonomy
The engine automatically classifies every ticket across the following dimensions:
- **Issue Category**: Broad domain (e.g., Sensors & PLC Connectivity, Systems Reliability).
- **Root Cause**: The underlying technical failure (e.g., Missing Capability, Infrastructure Issue).
- **Severity**: Criticality level (Critical, High, Medium, Low) based on impact and sentiment.
- **Strategic Roadmap**: A prescriptive technical action plan for resolution.

---

## 🏗️ Architecture & Tech Stack
- **Frontend**: [React (Vite)](file:///Users/psaipratyusha/Library/Mobile%20Documents/com~apple~CloudDocs/Zendesk%205/frontend-react) - Running on **Port 5174**.
- **Backend**: [Flask (Python)](file:///Users/psaipratyusha/Library/Mobile%20Documents/com~apple~CloudDocs/Zendesk%205/backend) - Running on **Port 5003**.
- **Database**: MySQL (`zendesk_demo`) with SQLite fallback for local development.
- **Intelligence**: Gemini 2.0 Flash (Primary) with multi-model failover (Groq/Llama 3.3).

---

## 🚀 Getting Started

### 1. Backend Setup
1. Navigate to `backend/`.
2. Start the server:
   ```bash
   python3 app.py
   ```
   *Server runs on [http://localhost:5003](http://localhost:5003)*

### 2. Frontend Setup
1. Navigate to `frontend-react/`.
2. Start the development server:
   ```bash
   npm run dev -- --port 5174
   ```

---

## 📂 API Reference (Simulation)

### Process External Ticket
```bash
curl -X POST http://localhost:5003/api/tickets/close \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": 412,
    "title": "Device Connectivity Issue",
    "description": "Customer reporting intermittent signal on Duo 74a434b...",
    "status": "closed"
  }'
```

### Process Specialized Email Payload
```bash
curl -X POST http://localhost:5003/api/process-email \
  -H "Content-Type: application/json" \
  -d '{
    "output": {
      "item_1": "Description here...",
      "text": "Full email thread..."
    }
  }'
```

---

Developed with 💎 by **Thirdeyedata**.
Chain
When a ticket is processed, the engine attempts to obtain structured insights in the following order:

1. **Primary: Groq (Llama 3.3 70B)** ⚡
   - Primary LPU-powered inference for ultra-fast performance.
   - Handles the bulk of taxonomy classification and summarization.
   - Automatic fallback if Groq hits rate limits or is unreachable.
   - Provides consistent, high-intelligence analysis for complex cases.
3. **Tertiary: xAI (Grok)** 🛡️
   - Final cloud-based model redundancy to ensure high availability.
4. **Final Fallback: Keyword-Powered Heuristics** ⚙️
   - Native Python NLP logic (using regex and keyword mapping).
   - Ensures that *every* ticket receives a classification, severity level, and summary, even if all external APIs are offline.

### 🧹 Advanced Data Pre-processing
Before reaching the AI models, raw ticket data is passed through a "Deep Cleanup" pipeline:
- **Signature Removal**: Intelligently identifies and strips legal disclaimers, company footers, and contact blocks.
- **Metadata Filtering**: Decodes complex unicode characters and removes technical headers that clutter analysis.
- **Intelligent Translation**: Integrated with translation services to handle non-English tickets before they reach the classification engine.

Developed with 💎 by **Thirdeyedata**.
