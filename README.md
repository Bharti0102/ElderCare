# ElderCare AI 👵👴🤖

> A Voice-First AI Care Coordinator for Elderly Users.

ElderCare AI empowers senior citizens to maintain independence, stay closely connected with caregivers, seamlessly manage daily medications, comprehend written prescriptions, and coordinate medical appointments through compassionate, voice-first artificial intelligence.

---

## 🌟 Core Pillars

1. **Emergency & Caregiver Calling**: Controlled, authorized voice calls to family and primary emergency contacts.
2. **Prescription Intelligence**: OCR and vision analysis of physical medical prescriptions without hallucination or alteration.
3. **Smart Reminders**: Natural language recurring reminders for medication, appointments, and daily hydration.
4. **Hospital & Reception Assistance**: Direct phone connections and AI-assisted availability inquiries.
5. **AI Companion**: Compassionate conversational partner for storytelling, empathy, and cognitive engagement.
6. **Voice-First Pipeline**: Hands-free speech-to-text and text-to-speech built for accessibility and ease of use.

---

## 🏗️ Architecture

ElderCare AI adheres strictly to **Clean Architecture**:
```text
Client (React + Vite + Tailwind CSS)
   │
   ▼ HTTP/JSON
Route Handler (Express)
   │
   ▼
Controller (Thin Validation & Delegation)
   │
   ▼
Service (Business Logic)
   │
   ▼
Integrations / MongoDB (Mongoose)
```

For AI operations:
```text
User Request (Voice/Text)
   │
   ▼
AI Orchestrator (Intent Recognition & Policy)
   │
   ▼
Validated Tool
   │
   ▼
Domain Service → Persistence / Integration
```

---

## 📁 Repository Structure

```text
eldercare-ai/
├── client/          # React + Vite + TypeScript frontend
├── server/          # Node.js + Express + TypeScript backend
├── docs/            # Comprehensive system and API documentation
├── CLAUDE.md        # Assistant instructions and architectural invariants
├── PROJECT_STATUS.md# Phase-by-phase build tracking
└── README.md        # Project guide
```

---

## 🚀 Quickstart (Phase 0)

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

### Setup & Installation
```bash
# Install root dependencies
npm install

# Setup Server
cd server
npm install
npm run dev

# Setup Client (in a separate terminal)
cd ../client
npm install
npm run dev
```

Visit `http://localhost:5173` to see the live ElderCare AI dashboard and system status.
