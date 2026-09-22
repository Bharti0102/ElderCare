# ElderCare AI — API Specifications

## Standard Response Envelope
All API endpoints follow a consistent JSON response envelope.

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable error description",
    "details": null
  }
}
```

## Phase 0 Endpoint

### `GET /api/health`
Checks the server and database status.
- **Access**: Public
- **Response**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-09-22T17:35:00.000Z",
    "uptime": 124.5,
    "environment": "development",
    "database": {
      "status": "connected",
      "host": "127.0.0.1",
      "name": "eldercare_ai"
    }
  }
}
```
