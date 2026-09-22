# ElderCare AI — System Architecture

## Architectural Principles
1. **Clean Separation of Concerns**: Strict layering with distinct boundaries:
   - **Routes**: Define HTTP endpoints, HTTP verb mapping, and attach middleware.
   - **Controllers**: Thin request unwrappers. Perform preliminary validation, delegate immediately to services, and format standardized responses.
   - **Services**: Encapsulate all business logic, orchestration, and domain rules. Independent of HTTP transport.
   - **Integrations**: Encapsulate vendor-specific SDKs and APIs (telephony, speech, OCR, LLMs). Replaceable without altering service contracts.
   - **Database / Models**: Mongoose schemas defining structured persistence and indexes.
2. **AI Orchestrator Invariant**:
   - The LLM never communicates directly with databases, file systems, or external providers.
   - All AI actions are executed via strictly typed, validated tools that delegate to verified domain services.

```text
+-------------------------------------------------------+
|                   Client (React UI)                   |
+-------------------------------------------------------+
                           |
                           | HTTP / JSON (or WebSocket)
                           v
+-------------------------------------------------------+
|                     Express API                       |
|   [Route] -> [Controller] -> [Domain Service]        |
+-------------------------------------------------------+
              |                              |
              v                              v
     +-----------------+           +--------------------+
     | MongoDB Database|           | AI Orchestrator    |
     +-----------------+           +--------------------+
                                             |
                                             v
                                   +--------------------+
                                   | Tool Execution     |
                                   +--------------------+
                                             |
                                             v
                                   +--------------------+
                                   | Provider Adapter   |
                                   +--------------------+
```

## Security & Privacy Guidelines
- User data must be scoped to the authenticated user ID on every query.
- File uploads (prescriptions) must validate MIME types and enforce size boundaries.
- No third-party API credentials, database URIs, or tokens may ever be exposed to the client.
