# ElderCare AI — Agent & Tool Workflows

## Orchestration Flow
When a user provides voice or text input, the request is processed through the central AI Orchestrator.

```text
User Input ("Call my daughter")
         |
         v
AI Orchestrator (Intent: CALL_CAREGIVER)
         |
         v
Schema Validation (Zod Tool Parameters)
         |
         v
Calling Tool
         |
         v
Caregiver Service (Authenticate user, resolve primary contact)
         |
         v
Calling Provider Adapter (Initiate Twilio/Mock call)
         |
         v
Result Envelope -> Orchestrator -> User Feedback (Voice / TTS)
```

## Intent Spectrum
1. `CHAT` — General empathetic conversation, cognitive games, storytelling.
2. `CREATE_REMINDER` — Scheduled medication or daily activity reminders.
3. `CALL_CAREGIVER` — Emergency or routine contact dialing.
4. `PRESCRIPTION_INQUIRY` — Questions regarding confirmed prescription data.
5. `HOSPITAL_APPOINTMENT` — Medical reception calls and scheduling queries.

## Guardrails
- **No Hallucinated Actions**: The AI must not state a reminder was set or call made unless the corresponding tool returned a successful execution status.
- **Safety Fallback**: Any detected medical distress triggers immediate caregiver call suggestion and emergency helpline display.
