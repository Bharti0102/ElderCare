# CLAUDE.md — ElderCare AI Developer & Assistant Guide

## Project Overview
**ElderCare AI** is a voice-first AI care coordinator for elderly users. It helps elderly individuals communicate with caregivers, manage natural-language medication reminders, understand uploaded prescriptions, contact hospitals/doctors, and have a supportive conversational AI companion.

## Master Build Order (Phase by Phase)
Build the project strictly phase by phase. Never implement future phases early.
- **PHASE 0 — Foundation** (Current)
- **PHASE 1 — Authentication + Emergency Contacts**
- **PHASE 2 — AI Orchestrator + Companion**
- **PHASE 3 — Reminder Agent**
- **PHASE 4 — Prescription Intelligence**
- **PHASE 5 — Caregiver Calling**
- **PHASE 6 — Hospital Calling + Appointment Assistance**
- **PHASE 7 — Voice**
- **PHASE 8 — Integration + Polish**

## Core Architectural Rules
1. **Clean Architecture Flow**:
   ```text
   Route → Controller → Service → Integration / Database
   ```
2. **AI Workflow Pattern**:
   ```text
   LLM → AI Orchestrator → Tool → Service → Integration / Database
   ```
3. **Strict Prohibitions**:
   - Never allow LLM to write directly to MongoDB.
   - Never allow LLM to call telephony or external APIs directly without tool validation.
   - Never keep business logic in controllers (keep them thin).
   - Never expose provider secrets or backend tokens to frontend.
   - Never fake external API success, appointment bookings, or prescription data.
   - Never diagnose conditions or alter medication dosages.

## Session Startup Checklist
At the beginning of every session:
1. Read `CLAUDE.md`.
2. Read `PROJECT_STATUS.md`.
3. Read relevant architecture documentation in `docs/`.
4. Inspect existing implementation.
5. Implement ONLY the requested phase/task.
6. Validate all data with Zod or typed schemas.
7. Run typecheck, tests, and build.
8. Fix any errors before declaring complete.
9. Update `PROJECT_STATUS.md` and summarize changes.

## Development Commands
- Root: `npm run dev` (runs both client and server), `npm run build`, `npm run typecheck`
- Backend (`server/`):
  - Dev: `npm run dev`
  - Build: `npm run build`
  - Start: `npm run start`
  - Typecheck: `npm run typecheck`
- Frontend (`client/`):
  - Dev: `npm run dev`
  - Build: `npm run build`
  - Typecheck: `npm run typecheck`
