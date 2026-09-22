# ElderCare AI — Master Build Specification for Claude Code

## 1. Project Goal

Build a new project from scratch called **ElderCare AI**.

ElderCare AI is a voice-first AI care coordinator for elderly users. The system should help an elderly person communicate with caregivers, manage reminders, understand prescriptions, contact hospitals, and have a conversational AI companion.

The project must be built **phase by phase**. Do not attempt to build the whole system in one task.

Every phase must:
- leave the application in a working state;
- use clean, maintainable TypeScript;
- preserve the architecture;
- avoid duplicating existing functionality;
- include validation and error handling;
- test the implemented workflow before moving on;
- update project documentation/status.

The final system should be suitable for:
- a college project;
- a live demonstration;
- an interview discussion;
- future extension into a production-style application.

---

# 2. Core Features

## Feature A — Emergency/Caregiver Calling

Example:

> "Call my daughter."

Flow:

User voice/text
→ speech-to-text if voice
→ AI Orchestrator
→ identify intent/contact
→ validate contact
→ Calling Tool
→ Calling Service
→ Telephony Provider
→ caregiver phone

Rules:
- Never hardcode phone numbers.
- Never let the LLM directly call a phone API.
- The system must use a configured, authorized contact.
- The call must be explicitly requested or triggered through a controlled workflow.
- Never fake a successful call.
- Record call status.
- Use a controlled test number/provider during development.

---

# 3. Prescription Intelligence

User uploads a prescription.

Flow:

Prescription image/PDF
→ OCR/Vision
→ structured extraction
→ validation
→ show extracted information
→ user confirmation
→ save prescription

Extract only information actually present in the document, such as:
- doctor name;
- hospital/clinic;
- reception/contact number;
- medicines;
- dosage/instructions if clearly written;
- prescription date.

The system must NOT:
- invent missing information;
- diagnose a condition;
- change dosage;
- invent medicines;
- present uncertain OCR as confirmed medical information.

Prescription information should branch into:

Doctor/Hospital information
→ Calling workflow

Medicine information
→ Reminder workflow

---

# 4. Appointment/ Hospital Calling

After prescription information is available, the user can request an appointment.

Provide two modes:

### Mode A — User talks to reception

The system connects/assists the user in contacting the configured hospital/reception number.

### Mode B — AI talks to reception

The AI calling agent identifies itself as an AI assistant and communicates with reception.

It may:
- ask whether appointments are available;
- ask available dates/times;
- collect necessary appointment information;
- report the result to the user.

Before any final booking/commitment:
- clearly show/communicate the proposed appointment;
- require user confirmation unless a real authorized booking integration explicitly supports autonomous booking.

Never:
- impersonate the patient;
- claim a booking succeeded when it did not;
- invent hospital responses.

---

# 5. Reminder Agent

Natural-language reminders.

Examples:

> "Remind me to take my medicine at 8 PM every day."

> "Remind me tomorrow morning to call the doctor."

> "Snooze this reminder for 10 minutes."

The system should support:
- create;
- list;
- update;
- delete;
- complete;
- snooze;
- recurring reminders;
- notification/scheduler execution.

Flow:

User request
→ AI Orchestrator
→ Reminder Tool
→ validate structured parameters
→ Reminder Service
→ MongoDB
→ Scheduler
→ notification

---

# 6. AI Companion

The companion provides:
- normal conversation;
- loneliness/social conversation;
- stories;
- entertainment;
- general questions;
- simple assistance.

For health-related questions:
- provide general informational guidance;
- do not diagnose;
- do not prescribe;
- do not change medication;
- encourage professional help when appropriate.

The companion should work through the same orchestrator architecture rather than creating a second unrelated AI system.

---

# 7. Voice-First Architecture

Final voice flow:

Microphone
→ Speech-to-Text
→ user transcript
→ AI Orchestrator
→ Tool/Chat
→ result
→ Text-to-Speech
→ speaker

Voice should be implemented after the underlying text workflows work.

This keeps debugging manageable.

---

# 8. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- reusable UI components
- Axios or equivalent API client

## Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Zod or equivalent validation
- authentication using secure HTTP-only cookies or another secure approach

## AI

Use a provider abstraction.

Do not hardcode the application architecture around one LLM provider.

Example:

```text
services/ai/llm.service.ts
integrations/llm/
```

## External Integrations

Keep provider-specific code inside:

```text
integrations/
```

Possible categories:

```text
integrations/
├── llm/
├── telephony/
├── speech/
└── ocr/
```

The business logic should not depend directly on provider SDK calls.

---

# 9. Clean Architecture

Use this backend flow:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Integration / Database
```

For AI workflows:

```text
LLM
 ↓
AI Orchestrator
 ↓
Tool
 ↓
Service
 ↓
Integration / Database
```

Never use:

```text
LLM → MongoDB
LLM → arbitrary API
LLM → phone provider
Controller → complex business logic
Frontend → provider secrets
```

Controllers should be thin.

Services contain business logic.

Integrations contain external-provider-specific logic.

Models contain persistence schemas.

Validators validate external/user/AI-generated data.

---

# 10. Final Project Structure

```text
eldercare-ai/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── voice/
│   │   │   ├── reminders/
│   │   │   ├── calling/
│   │   │   ├── prescription/
│   │   │   └── chat/
│   │   │
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Reminders.tsx
│   │   │   ├── Calls.tsx
│   │   │   ├── Prescription.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── Profile.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── agent.service.ts
│   │   │   ├── reminder.service.ts
│   │   │   ├── calling.service.ts
│   │   │   ├── prescription.service.ts
│   │   │   └── chat.service.ts
│   │   │
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── EmergencyContact.ts
│   │   ├── Reminder.ts
│   │   ├── Prescription.ts
│   │   ├── Call.ts
│   │   ├── Appointment.ts
│   │   └── Conversation.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── agent.routes.ts
│   │   ├── reminder.routes.ts
│   │   ├── calling.routes.ts
│   │   ├── prescription.routes.ts
│   │   └── chat.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── agent.controller.ts
│   │   ├── reminder.controller.ts
│   │   ├── calling.controller.ts
│   │   ├── prescription.controller.ts
│   │   └── chat.controller.ts
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── orchestrator.service.ts
│   │   │   ├── llm.service.ts
│   │   │   └── tools/
│   │   │       ├── reminder.tool.ts
│   │   │       ├── calling.tool.ts
│   │   │       ├── prescription.tool.ts
│   │   │       └── chat.tool.ts
│   │   │
│   │   ├── reminder/
│   │   │   ├── reminder.service.ts
│   │   │   └── reminder.scheduler.ts
│   │   │
│   │   ├── calling/
│   │   │   ├── calling.service.ts
│   │   │   ├── caregiver.service.ts
│   │   │   └── hospital.service.ts
│   │   │
│   │   ├── prescription/
│   │   │   ├── prescription.service.ts
│   │   │   └── ocr.service.ts
│   │   │
│   │   └── chat/
│   │       └── chat.service.ts
│   │
│   ├── integrations/
│   │   ├── llm/
│   │   ├── telephony/
│   │   ├── speech/
│   │   └── ocr/
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── upload.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── validators/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   └── agent-workflows.md
│
├── CLAUDE.md
├── PROJECT_STATUS.md
├── .env.example
├── .gitignore
└── README.md
```

---

# 11. Database Models

## User

```text
name
email
passwordHash
phone
createdAt
updatedAt
```

## EmergencyContact

```text
userId
name
relationship
phone
isPrimary
createdAt
updatedAt
```

## Reminder

```text
userId
title
description
category
scheduledAt
repeat
status
createdAt
updatedAt
```

Possible repeat values:

```text
none
daily
weekly
monthly
```

## Prescription

```text
userId
fileUrl/reference
doctor
hospital
receptionPhone
medicines[]
prescriptionDate
ocrConfidence/details if useful
status
createdAt
updatedAt
```

## Call

```text
userId
contactId/reference
phoneNumber
type
providerCallId
status
startedAt
endedAt
createdAt
updatedAt
```

Call types:

```text
CAREGIVER
HOSPITAL
```

Statuses:

```text
REQUESTED
CALLING
CONNECTED
COMPLETED
FAILED
CANCELLED
```

## Appointment

```text
userId
prescriptionId
hospital
doctor
requestedDate
requestedTime
status
source
notes
createdAt
updatedAt
```

## Conversation

```text
userId
messages[]
createdAt
updatedAt
```

---

# 12. Security Rules

Always enforce:

- authentication;
- authorization;
- user-scoped database queries;
- input validation;
- AI output validation;
- file type validation;
- file size limits;
- phone number validation;
- rate limiting where appropriate;
- secure cookies;
- environment variables for secrets;
- sanitized errors;
- no provider keys in frontend;
- no sensitive data in logs.

Never trust LLM output.

Example:

```text
LLM says:
phone = "+919999999999"

Do NOT immediately call it.

Instead:

LLM output
→ schema validation
→ verify contact belongs to authenticated user
→ authorization
→ calling service
→ provider
```

---

# 13. Development Rules for Claude

1. Inspect the existing code before changing it.
2. Do not rewrite working code unnecessarily.
3. Do not implement future phases early.
4. Do not add unnecessary libraries.
5. Prefer simple TypeScript.
6. Keep functions small.
7. Use meaningful names.
8. Keep controllers thin.
9. Keep business logic in services.
10. Keep provider-specific logic in integrations.
11. Reuse existing utilities.
12. Do not duplicate API calls or business logic.
13. Validate all external input.
14. Validate AI-generated structured data.
15. Do not hardcode secrets.
16. Do not hardcode phone numbers.
17. Do not fake external API success.
18. Do not fake appointment booking.
19. Do not invent prescription information.
20. Do not provide medical diagnosis or change medication.
21. Keep frontend and backend responsibilities separate.
22. Use typed interfaces.
23. Run tests/typecheck/build after meaningful changes.
24. Fix errors before declaring a task complete.
25. Do not modify unrelated files.
26. Update documentation when architecture changes.
27. Update `PROJECT_STATUS.md` at the end of every phase.
28. Before starting a phase, read `CLAUDE.md` and `PROJECT_STATUS.md`.
29. Before claiming a feature works, perform an end-to-end test.
30. If an external provider cannot be configured, implement a clean provider interface and a development/mock adapter rather than faking production success.

---

# 14. Phase-by-Phase Development Plan

## PHASE 0 — Foundation

### Goal

Create the clean project skeleton.

### Tasks

- initialize repository;
- create client;
- create server;
- configure TypeScript;
- configure MongoDB;
- configure environment variables;
- create Express app;
- create error middleware;
- create API response/error conventions;
- configure frontend routing;
- create basic UI shell;
- create health endpoint;
- connect frontend to backend;
- create initial documentation;
- create `CLAUDE.md`;
- create `PROJECT_STATUS.md`.

### Deliverable

```text
Frontend
  ↓
Backend
  ↓
MongoDB
```

all running successfully.

### Do not build

- AI;
- reminders;
- calling;
- prescription;
- voice.

---

# PHASE 1 — Authentication + Emergency Contacts

### Tasks

Authentication:

- User model;
- signup;
- login;
- logout;
- current-user endpoint;
- auth middleware;
- protected routes.

Emergency contacts:

- model;
- create;
- list;
- update;
- delete;
- set primary contact.

Frontend:

- login;
- signup;
- dashboard;
- emergency contact management.

### End-to-end test

Create user
→ login
→ add daughter
→ set primary
→ refresh
→ verify data persists.

### Deliverable

A working user/account/contact system.

---

# PHASE 2 — AI Orchestrator + Companion

### Goal

Introduce the central AI architecture.

### Tasks

Create:

```text
agent.routes.ts
agent.controller.ts
orchestrator.service.ts
llm.service.ts
chat.tool.ts
chat.service.ts
```

Initial intents:

```text
CHAT
```

Optionally define future intent types without implementing future behavior:

```text
CREATE_REMINDER
CALL_CAREGIVER
PRESCRIPTION
HOSPITAL_CALL
```

### Flow

```text
POST /api/agent
→ controller
→ orchestrator
→ LLM
→ validated result
→ chat service/tool
→ response
```

### Deliverable

User can chat naturally with ElderCare AI.

---

# PHASE 3 — Reminder Agent

### Goal

Create the first complete agentic workflow.

### Task Group A — Data

- Reminder model;
- schema validation;
- reminder service.

### Task Group B — REST

- create;
- list;
- update;
- delete;
- complete;
- snooze.

### Task Group C — AI Tool

Create structured reminder tool.

Example structured output:

```json
{
  "action": "CREATE",
  "title": "Take medicine",
  "scheduledAt": "...",
  "repeat": "daily"
}
```

Validate before execution.

### Task Group D — Scheduler

- scheduled execution;
- recurring reminders;
- notification mechanism;
- failure handling.

### Task Group E — UI

- reminder list;
- reminder form;
- status;
- snooze;
- completion;
- delete.

### End-to-end test

Say:

> Remind me to take medicine at 8 PM every day.

Verify:

```text
AI
→ reminder tool
→ validation
→ MongoDB
→ scheduler
→ notification
```

### Deliverable

A complete AI reminder agent.

---

# PHASE 4 — Prescription Intelligence

### Task Group A

- file upload;
- validation;
- secure storage/reference;
- Prescription model.

### Task Group B

Create OCR/Vision abstraction:

```text
OCR Service
→ OCR Integration
```

### Task Group C

Extract:

- doctor;
- hospital;
- reception phone;
- medicines;
- date;
- clearly written instructions.

### Task Group D

Create confirmation UI.

User must review extracted information before it becomes trusted application data.

### Task Group E

Connect medicine data to reminder creation.

### Deliverable

Upload prescription
→ extract
→ review
→ confirm
→ save
→ optionally create medicine reminders.

---

# PHASE 5 — Caregiver Calling

### Goal

Implement the primary emergency/caregiver workflow.

### Task Group A

Create calling abstraction:

```ts
interface CallingProvider {
  makeCall(...): Promise<...>;
  getCallStatus(...): Promise<...>;
  transferCall(...): Promise<...>;
  hangupCall(...): Promise<...>;
}
```

### Task Group B

Create:

```text
calling.service.ts
caregiver.service.ts
calling.tool.ts
Call model
```

### Task Group C

Flow:

```text
"Call my daughter"
→ orchestrator
→ identify caregiver
→ validate
→ authorize
→ calling tool
→ calling service
→ telephony provider
```

### Task Group D

Call status UI.

### End-to-end test

Use a controlled test number.

Verify:

```text
request
→ call initiated
→ status updated
→ call completed/failed
→ history stored
```

### Deliverable

Real caregiver calling workflow.

---

# PHASE 6 — Hospital Calling + Appointment Assistance

### Goal

Connect prescription information with appointment assistance.

### Task Group A

Hospital service.

### Task Group B

Human-call workflow.

### Task Group C

AI-call workflow.

### Task Group D

Conversation state management for the AI calling agent.

The AI should be able to:

- introduce itself as an AI assistant;
- state the purpose of the call;
- ask appointment availability;
- collect relevant information;
- return the result.

### Task Group E

Appointment confirmation.

Never claim success unless the external system actually confirms it.

### Deliverable

```text
Prescription
→ hospital details
→ appointment request
→ user chooses call mode
→ hospital interaction
→ result
→ user confirmation
```

---

# PHASE 7 — Voice

### Goal

Convert the existing working workflows into a voice-first experience.

### Tasks

- microphone UI;
- speech-to-text abstraction;
- speech integration;
- transcript handling;
- send transcript to orchestrator;
- text-to-speech abstraction;
- speech output;
- interruption/loading/error states.

### Final flow

```text
Microphone
→ STT
→ Orchestrator
→ Tool/Chat
→ Result
→ TTS
→ Speaker
```

### Test

Voice requests:

```text
"Call my daughter."

"Remind me to take my medicine at eight."

"Tell me a story."

"I want to call my doctor."
```

---

# PHASE 8 — Integration + Polish

### Tasks

Dashboard integration.

Add:

- reminders summary;
- emergency contact;
- call history;
- prescription history;
- appointment information;
- companion entry point;
- voice assistant.

Accessibility:

- large buttons;
- readable fonts;
- clear labels;
- high usability for elderly users;
- simple navigation;
- confirmation before important actions.

Reliability:

- loading states;
- retry;
- timeout handling;
- provider failures;
- network failures;
- empty states.

Security:

- authorization audit;
- input validation audit;
- file upload audit;
- secret audit;
- rate limiting.

Testing:

- unit tests for services;
- integration tests for APIs;
- end-to-end tests for critical flows.

Documentation:

- architecture;
- database;
- APIs;
- agent workflows;
- setup instructions;
- environment variables;
- demo instructions.

### Final deliverable

A coherent, demo-ready ElderCare AI system.

---

# 15. Critical End-to-End Demo Flows

The final application must demonstrate these workflows.

## Demo 1 — Caregiver Call

```text
User:
"Call my daughter."

→ STT
→ Orchestrator
→ Calling Tool
→ Contact validation
→ Calling Service
→ Telephony
→ Call
→ Status
```

## Demo 2 — Reminder

```text
User:
"Remind me to take my medicine at 8 PM every day."

→ STT
→ Orchestrator
→ Reminder Tool
→ Validation
→ MongoDB
→ Scheduler
→ Notification
```

## Demo 3 — Prescription

```text
Upload prescription
→ OCR/Vision
→ Extract
→ Review
→ Confirm
→ Save
```

## Demo 4 — Appointment

```text
Prescription
→ hospital information
→ "I need an appointment"
→ choose user call / AI call
→ hospital interaction
→ result
→ confirmation
```

## Demo 5 — Companion

```text
User:
"I'm feeling lonely."

→ STT
→ Orchestrator
→ Chat Tool
→ LLM
→ response
→ TTS
```

---

# 16. Claude Code Session Strategy

Do not ask Claude to complete an entire phase in one huge prompt.

Use smaller tasks.

Example:

```text
PHASE 3
  ↓
3A — Model + Service
  ↓
3B — REST API
  ↓
3C — AI Tool + Orchestrator
  ↓
3D — Scheduler
  ↓
3E — Frontend
  ↓
3F — End-to-End Testing
```

At the end of each task Claude must:

1. inspect its changes;
2. run typecheck;
3. run tests;
4. run build where appropriate;
5. fix errors;
6. update status;
7. summarize exactly what changed.

Do not move to the next task if the current task is broken.

---

# 17. Context/Usage Optimization

Claude should not repeatedly receive the complete project specification in prompts.

Use:

```text
CLAUDE.md
PROJECT_STATUS.md
docs/
```

as persistent project context.

At the beginning of every new session:

```text
Read:
1. CLAUDE.md
2. PROJECT_STATUS.md
3. relevant documentation
4. relevant existing source files
```

Then work only on the requested task.

Avoid asking Claude to re-explain the entire project before every task.

Avoid rebuilding completed phases.

Avoid broad requests such as:

> "Review the entire project and improve everything."

Instead use:

> "Review only the reminder workflow for this task. Do not modify unrelated features."

---

# 18. Definition of Done

A task is NOT complete merely because code was generated.

A task is complete when:

- implementation exists;
- TypeScript passes;
- tests pass where applicable;
- build passes;
- API behavior is verified;
- errors are handled;
- authorization is checked;
- no secrets are exposed;
- no unrelated files were unnecessarily modified;
- documentation/status is updated;
- the actual workflow has been tested.

---

# 19. Git Strategy

Create a Git commit after each meaningful task or stable phase.

Suggested commits:

```text
feat: initialize eldercare foundation
feat: add authentication
feat: add emergency contacts
feat: add ai orchestrator
feat: add reminder agent
feat: add prescription intelligence
feat: add caregiver calling
feat: add hospital calling
feat: add voice pipeline
feat: integrate eldercare dashboard
test: add critical workflow tests
docs: update project documentation
```

Never use Git as a substitute for testing.

---

# 20. How Claude Should Handle Problems

If an external API is unavailable:

- do not fake production behavior;
- isolate the provider;
- create a mock/development adapter if useful;
- clearly mark what is mocked;
- keep the production interface clean.

If a requirement is ambiguous:

- inspect existing architecture;
- choose the simplest design consistent with the specification;
- document the decision;
- do not redesign unrelated parts.

If a task requires changing architecture:

- explain why;
- make the smallest safe change;
- update documentation.

If existing code is broken:

- diagnose the actual cause;
- make the smallest appropriate fix;
- do not rewrite the entire feature unless necessary.

---

# 21. Master Build Order

```text
PHASE 0
Foundation
    ↓
PHASE 1
Authentication + Emergency Contacts
    ↓
PHASE 2
AI Orchestrator + Companion
    ↓
PHASE 3
Reminder Agent
    ↓
PHASE 4
Prescription Intelligence
    ↓
PHASE 5
Caregiver Calling
    ↓
PHASE 6
Hospital Calling + Appointment
    ↓
PHASE 7
Voice
    ↓
PHASE 8
Integration + Testing + Polish
```

This order is intentional.

Do NOT move voice to the beginning.

Do NOT implement hospital calling before caregiver calling.

Do NOT connect the LLM directly to external APIs.

Do NOT build all agents independently.

The orchestrator and tool architecture should become the central foundation for all AI actions.

---

# 22. First Claude Code Instruction

When starting the project, give Claude the following instruction:

> You are working on ElderCare AI.
>
> First read this project's `CLAUDE.md`, `PROJECT_STATUS.md`, and relevant documentation.
>
> We are building the project phase by phase.
>
> Do NOT implement future phases.
>
> Start with PHASE 0 only.
>
> Inspect the repository first. If the repository is empty, initialize the project according to the architecture in this specification.
>
> Implement only the foundation:
> - React + TypeScript client;
> - Node + Express + TypeScript server;
> - MongoDB configuration;
> - environment configuration;
> - basic API structure;
> - error handling;
> - frontend routing;
> - basic UI shell;
> - health endpoint;
> - documentation;
> - CLAUDE.md;
> - PROJECT_STATUS.md.
>
> Do not implement authentication, reminders, calling, prescription OCR, voice, or AI workflows yet.
>
> Use clean architecture:
>
> Route → Controller → Service → Integration/Database.
>
> Keep controllers thin and business logic inside services.
>
> Do not add unnecessary dependencies.
>
> After implementation:
> 1. run typecheck;
> 2. run tests if available;
> 3. run production builds;
> 4. fix all errors;
> 5. update PROJECT_STATUS.md;
> 6. summarize files changed and tests performed.
>
> Stop after PHASE 0. Do not continue into PHASE 1.

---

# 23. Rule for Every Future Claude Prompt

Every future phase/task should follow this pattern:

```text
1. Read CLAUDE.md.
2. Read PROJECT_STATUS.md.
3. Read relevant architecture documentation.
4. Inspect existing implementation.
5. Implement ONLY the requested task.
6. Do not rebuild completed functionality.
7. Do not implement future phases.
8. Follow Route → Controller → Service → Integration.
9. For AI: Orchestrator → Tool → Service → Integration.
10. Validate all user and AI-generated data.
11. Run typecheck/tests/build.
12. Fix errors.
13. Update PROJECT_STATUS.md.
14. Summarize changes.
15. Stop.
```

---

# 24. Final Principle

The goal is not:

> "Generate as much code as possible."

The goal is:

> **Build one reliable workflow at a time while preserving a clean architecture.**

The finished project should be understandable as:

```text
                 USER
                  │
            Voice / Text
                  │
                  ▼
             ORCHESTRATOR
                  │
       ┌──────────┼───────────┐
       │          │           │
       ▼          ▼           ▼
   REMINDER    CALLING    PRESCRIPTION
       │          │           │
       │          │           ├── Doctor/Hospital
       │          │           │       ↓
       │          │           │   Calling
       │          │
       │          └── Caregiver
       │
       └── Scheduler

                  │
                  ▼
             AI COMPANION
```

Every major feature should be independently testable, and every external provider should be replaceable without changing the core business logic.
