# Support Intel: AI-Powered Support Analytics Dashboard 🚀🛡️✨

Support Intel is a premium, full-stack intelligence engine designed to transform raw support tickets into actionable business insights. Built for high-volume environments (like Factbird/IoT), it uses a sophisticated **Hybrid AI Processing Chain** and a sleek, **Glassmorphic UI** to help support teams work faster and smarter.

---

## 🌟 Key Features

### 🧠 1. Intelligent Ticket Analysis
- **Intent-Aware Summaries**: Automatically generates concise, professional problem and solution summaries.
- **Automated Taxonomy**: Classifies tickets by **Category**, **Severity**, **Root Cause**, and **Product Area**.
- **Chain-of-Thought Reasoning**: The AI provides a justification for every classification, ensuring full transparency.
- **Entity Extraction**: Automatically identifies **Stakeholders**, **Device IDs**, and technical notes embedded in threads.
- **Deep Cleanup**: Intelligent filtering of email signatures, company disclaimers, and metadata (unicode decoding included).

### ⚙️ 2. Hybrid AI Intelligence Engine
- **Failover Chain**: High-reliability processing that cascades through multiple providers:
  1. **Groq (Llama 3.3)**: Primary, ultra-fast LPU processing.
  2. **Grok (xAI)**: Secondary high-intelligence fallback.
  3. **OpenAI (GPT-4o-mini)**: Tertiary backup.
  4. **Keyword Heuristics**: 100% reliable local pre-processor/fallback.
- **Denmark Specialized**: Built-in support for Danish character sets and Scandinavian region patterns.

### 🔋 3. Strategic Account Pulse (📡)
- **Health Aggregator**: Real-time aggregation of tickets by company name.
- **AI Health Scoring**: Dynamically calculates account "Health" based on ticket volume, severity, and intent.
- **Account Intelligence Modal**: Deep-dive into specific client cases without leaving the health view.

### 📊 4. Advanced Reports & Analytics
- **Live Statistics**: Real-time aggregation of status, categories, and severity.
- **Premium Visualizations**: Interactive line charts, radar charts, and heatmaps (powered by Chart.js).
- **Trend Analysis**: Tracks AI confidence and support volume over time.

### 📖 5. Knowledge Base & AI Suggestions
- **Smart Suggest**: Automatically links relevant KB articles to open tickets based on problem context.
- **Interactive Reader**: Premium, formatted article viewing with a "Copy Solution" utility for agents.
- **KB Search**: Intelligent lookup with keyword highlighting.

### 🛠️ 6. Data Management
- **Single & Bulk Import**: Support for importing spreadsheets (Zendesk exports) or pasting raw ticket lists.
- **Secure Deletion**: Remove unwanted or test data with a professional confirmation flow.
- **Auto-Refresh**: Dashboard keeps data current with intelligent polling.

![Ticket Intelligence Table with Deletion](/Users/psaipratyusha/.gemini/antigravity/brain/4bb4fdbd-b451-4a73-919a-9fbcb8d6c8c4/ticket_table_with_delete_button_1773581171204.png)

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5 (Semantic), CSS3 (Premium Glassmorphism 2.0).
- **Backend**: Node.js, Express.js.
- **Database**: Dual-engine support (MySQL for production, SQLite for local testing).
- **Intelligence**: Integrated with LLM providers (Groq/OpenAI) + `compromise` and `html-entities` for NLP tasks.

### 📂 Directory Structure
```text
Zendesk/
├── README.md               # Main project documentation
├── backend/                # Server-side logic
│   ├── server.js           # Core Express API
│   ├── db.js               # Database connection & utilities
│   ├── ai.js               # Intelligence & LLM Failover logic
│   ├── populate.js         # SEED script for initial data
│   └── .env                # Environmental variables (keys/db)
├── frontend/               # Client-side interface
│   ├── index.html          # Main application structure
│   ├── style.css           # Premium styling & animations
│   └── script.js           # Frontend logic & data fetching
└── archive/                # Historical or reference files
```

---

## 🚀 Getting Started (Execution)

### 1. Backend Setup
1. Navigate to the `backend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file (ensure you have your database credentials and AI API keys):
   ```bash
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=zendesk_intel
   GROQ_API_KEY=your_key
   ```
4. (Optional) Initialize and seed the database:
   ```bash
   node populate.js
   ```
5. Start the server:
   ```bash
   node server.js
   ```
   *The server will run on [http://localhost:5001](http://localhost:5001)*

### 2. Frontend Execution
The project is built as a Single Page Application (SPA). To view it:
- Open `frontend/index.html` in any modern web browser.
- Ensure the backend is running; the frontend will automatically connect to it via the local API.

---

## 🛡️ Security & Reliability
- **CORS Enabled**: Configured for secure local development.
- **Error Handling**: Comprehensive try/catch blocks on all AI and DB operations.
- **Input Sanitization**: Clean handling of messy, stakeholder-rich ticket data.

Developed with 💎 by **Pratyusha**.
