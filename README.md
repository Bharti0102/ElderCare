# ElderCare AI 👵👴🤖

> **Empowering Senior Independence through Voice-First Artificial Intelligence, Direct Caregiver Calling, and Compassionate Health Coordination.**

## 📖 Overview

As seniors age, navigating complex digital interfaces, coordinating medical appointments, and reaching caregivers in urgent moments can become challenging. **ElderCare AI** is an intelligent, voice-first care coordination platform crafted specifically for seniors and their families.

By prioritizing natural speech, empathetic dialogue, direct real-time communication, and effortless appointment coordination, ElderCare AI helps older adults live independently while ensuring their loved ones and healthcare providers remain only one word away.

---

## 🌟 Key Features

### 🎙️ 1. Voice-First Multilingual Assistant
- **Hands-Free Interaction**: Real-time Speech-to-Text (STT) and dynamic Text-to-Speech (TTS) powered by the Web Speech API.
- **Multilingual Code-Switching**: Seamless, fluid code-switching between **English**, **हिंदी (Hindi)**, and **Hinglish** with automatic language detection.
- **Visual Voice Waveform**: An animated, accessible waveform that provides gentle real-time visual feedback for listening, processing, and speaking states.
- **Tap-to-Interrupt**: Complete control to pause or interrupt the assistant at any moment.

### 📞 2. Caregiver Connect & Direct Real-Time Calling
- **Zero-Cost Web Push**: Native W3C Web Push notifications via VAPID service workers, allowing incoming calls to ring even when the browser tab is closed.
- **Real-Time Audio Signaling**: Low-latency Socket.IO signaling with custom electronic telephone chimes and instant Accept/Decline modal overlays.
- **Browser-to-Browser Calling**: Peer-to-peer audio connections with live duration timers and quick-dial emergency cards.
- **Strict Contact Safety**: The system never calls unverified or hallucinated contacts; all calls resolve against verified emergency contacts configured by the user.

### 🏥 3. Hospital Reception & Appointment Assistance
- **Dual Calling Modes**:
  - **Mode A (Assisted Calling)**: Provides one-tap direct dialing to hospital reception desks with doctor and follow-up notes displayed.
  - **Mode B (AI Calling Agent)**: Autonomous AI calling agent that contacts reception to inquire about slot availability.
- **Non-Impersonation Invariant**: The AI explicitly introduces itself as *"ElderCare AI calling on behalf of patient [Name]"* and never impersonates the user.
- **Human-in-the-Loop Confirmation**: Appointments are never finalized autonomously; the patient reviews proposed time slots with explicit "Confirm" or "Decline" controls.

### ⏰ 4. Natural Language Reminders & Scheduler
- **Conversational Scheduling**: Create reminders simply by speaking (e.g., *"Remind me to take my medicine after dinner at 8 PM"* or *"Remind me to drink water every 2 hours"*).
- **Background Daemon**: A 30-second background scheduler continuously monitors pending reminders.
- **Flexible Recurrence**: Full support for one-off, daily, weekly, and monthly recurring alerts.
- **Chimes & Snooze**: Gentle audio alerts, audio chimes, native desktop notifications, and 15-minute snooze functionality.

### 💬 5. Empathetic AI Companion
- **Active Listening & Storytelling**: Reduces loneliness through comforting, supportive conversations, memory sharing, and cognitive engagement.
- **Session Management**: Multi-session conversation history with auto-titling and persistence.
- **Strict Medical Guardrails**: Refuses diagnostic queries, flags emergencies, and directs users to emergency contacts when acute symptoms are mentioned.

### 🦮 6. Senior-Centric Accessible UX (A11y)
- **High-Contrast Palette**: Designed with large, easily readable typography and distinct high-contrast color tokens.
- **Large Touch Targets**: Generously sized buttons and cards tailored for users with motor or visual limitations.
- **Universal Voice Floating Button**: Accessible from any screen in the application for immediate voice assistance.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (React 18 + Vite)                   │
│                                                                             │
│   ┌─────────────────────┐   ┌──────────────────────┐   ┌────────────────┐   │
│   │ Floating Voice HUD  │   │  Appointment Center  │   │ Caregiver Desk │   │
│   └──────────┬──────────┘   └──────────┬───────────┘   └────────┬───────┘   │
│              │                         │                        │           │
│              ▼                         ▼                        ▼           │
│       Web Speech API             REST API Client           Socket.IO Client │
│       (STT / TTS)               (State & Scheduling)      & Web Push SW     │
└──────────────┬─────────────────────────┬────────────────────────┬───────────┘
               │ HTTP / JSON             │ HTTP / JSON            │ WebSocket
               ▼                         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND CORE (Express + TypeScript)                 │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Routing & Middleware: Auth JWT | Zod Validation | Error Handling    │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         AI Orchestrator                             │   │
│   │   • Intent Recognition  • Medical Guardrails  • Context Assembly    │   │
│   └──────┬──────────────┬──────────────┬──────────────┬─────────────────┘   │
│          │              │              │              │                     │
│          ▼              ▼              ▼              ▼                     │
│      Chat Tool    Reminder Tool  Calling Tool   Hospital Tool               │
│          │              │              │              │                     │
│          ▼              ▼              ▼              ▼                     │
│     ChatService  ReminderService CallingService HospitalService             │
│          │              │              │              │                     │
└──────────┼──────────────┼──────────────┼──────────────┼─────────────────────┘
           ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL INTEGRATIONS & PERSISTENCE                   │
│                                                                             │
│   ┌────────────────────────┐   ┌────────────────────┐   ┌───────────────┐   │
│   │     AI LLM Engines     │   │  Web Push Service  │   │    MongoDB    │   │
│   │ (Gemini / Groq / Mock) │   │ (VAPID / Signaling)│   │  (Mongoose)   │   │
│   └────────────────────────┘   └────────────────────┘   └───────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Speech API |
| **Backend** | Node.js, Express 4.x, TypeScript, Zod, Socket.IO, Web-Push |
| **Database** | MongoDB, Mongoose ODM |
| **AI / LLMs** | Google Gemini, Groq LLM, Mock Provider Fallback |
| **Realtime & Calling** | WebRTC, Socket.IO Signaling, VAPID Web Push Notifications |
| **Authentication** | JSON Web Tokens (JWT), BCrypt password hashing, Secure Cookies |

---

## 📁 Project Structure

```text
eldercare-ai/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets & Service Worker (sw.js)
│   └── src/
│       ├── components/         # Modular UI (voice, appointments, calling, layout)
│       ├── context/            # Global state (Auth, Theme, Notifications)
│       ├── hooks/              # Custom hooks (useVoiceAssistant, useSocket)
│       ├── pages/              # Views (Dashboard, Chat, Appointments, Calls, etc.)
│       ├── services/           # Frontend API, calling, and push notification services
│       └── types/              # TypeScript domain types and interfaces
├── server/                     # Backend Application
│   └── src/
│       ├── config/             # Environment validation and database configuration
│       ├── controllers/        # Thin HTTP controllers
│       ├── integrations/       # External providers (LLM, Web Push, Notifications)
│       ├── middleware/         # Auth, validation, error handling
│       ├── models/             # Mongoose schemas (User, Contact, Reminder, etc.)
│       ├── routes/             # RESTful API route definitions
│       ├── services/           # Core business logic and AI Orchestrator
│       ├── utils/              # Text sanitizers, crypto helpers, chimes
│       └── validators/         # Zod input validation schemas
├── docs/                       # Architectural blueprints and API documentation
├── scripts/                    # Utility scripts (tunneling, maintenance)
└── README.md                   # Project documentation
```

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Running instance (Local installation or MongoDB Atlas cloud connection URI)

---

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Bharti0102/ElderCare.git
   cd ElderCare
   ```

2. **Install Server Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies**
   ```bash
   cd ../client
   npm install
   ```

---

### Environment Setup

Create a `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection (Local or MongoDB Atlas)
MONGODB_URI=your_mongodb_connection_uri_here

# Security & Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AI & LLM Providers (Optional - uses mock fallbacks if not supplied)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

*(Note: The application includes built-in mock fallbacks for AI and communication services, allowing complete local development even without external API keys).*

---

### Running the Application

You can run both client and server from their respective directories:

1. **Start Backend Server** (from `server/`):
   ```bash
   npm run dev
   ```
   *Server boots up on the configured port with MongoDB connection and reminder daemon.*

2. **Start Frontend Client** (from `client/`):
   ```bash
   npm run dev
   ```
   *Client dev server starts on `http://localhost:5173` (or your configured client port).*

3. Open the client URL in your browser.

---

## 🔒 Safety, Privacy & Ethical AI Guardrails

1. **No Medical Hallucination / No Prescriptions**:
   The AI assistant is strictly bound by system prompts and guardrails. It never prescribes medicine, alters dosages, or offers definitive clinical diagnoses. Any mention of acute chest pain, breathlessness, or severe distress triggers immediate emergency guidance and prompts to alert primary contacts.
2. **Explicit Non-Impersonation**:
   When communicating with clinic staff or hospital desks, the AI calling agent always identifies itself as an artificial intelligence assistant acting on behalf of the registered patient.
3. **Human-in-the-Loop Confirmation**:
   No appointments are finalized and no reminder schedules are committed without explicit user confirmation.
4. **Zero Number Invention**:
   The calling subsystem strictly forbids dialing unverified numbers. Outbound calls only route to verified emergency contacts or clinics validated by the user.

---

## 🧪 Testing & Verification

The project includes typecheck and build validation scripts:

```bash
# Typecheck server & client
npm run typecheck

# Build both applications
npm run build
```



*Dedicated to supporting elderly independence, caregiver peace of mind, and compassionate healthcare technology.*
