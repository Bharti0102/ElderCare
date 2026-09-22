# ElderCare AI — Database Schemas

All schemas are persisted in MongoDB via Mongoose. All domain entities (except User) are indexed and scoped by `userId`.

## 1. User
- `name`: String (required, trimmed)
- `email`: String (required, unique, lowercase, trimmed)
- `passwordHash`: String (required)
- `phone`: String (optional, E.164 formatted)
- `createdAt`: Date (auto timestamp)
- `updatedAt`: Date (auto timestamp)

## 2. EmergencyContact
- `userId`: ObjectId -> User (required, indexed)
- `name`: String (required)
- `relationship`: String (required, e.g., 'Daughter', 'Son', 'Doctor', 'Neighbor')
- `phone`: String (required, validated format)
- `isPrimary`: Boolean (default: false)
- `createdAt` / `updatedAt`: Date

## 3. Reminder
- `userId`: ObjectId -> User (required, indexed)
- `title`: String (required)
- `description`: String (optional)
- `category`: Enum ['MEDICATION', 'APPOINTMENT', 'HYDRATION', 'GENERAL']
- `scheduledAt`: Date (required)
- `repeat`: Enum ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']
- `status`: Enum ['PENDING', 'COMPLETED', 'SNOOZED', 'CANCELLED']
- `createdAt` / `updatedAt`: Date

## 4. Prescription
- `userId`: ObjectId -> User (required, indexed)
- `fileUrl`: String (required reference to uploaded file)
- `doctor`: String (optional)
- `hospital`: String (optional)
- `receptionPhone`: String (optional)
- `medicines`: Array of `{ name: String, dosage: String, frequency: String, instructions: String }`
- `prescriptionDate`: Date (optional)
- `ocrConfidence`: Number (optional)
- `status`: Enum ['RAW', 'EXTRACTED', 'VERIFIED_BY_USER']
- `createdAt` / `updatedAt`: Date

## 5. Call
- `userId`: ObjectId -> User (required, indexed)
- `contactId`: ObjectId -> EmergencyContact (optional reference)
- `phoneNumber`: String (required destination number)
- `type`: Enum ['CAREGIVER', 'HOSPITAL']
- `providerCallId`: String (telephony reference ID)
- `status`: Enum ['REQUESTED', 'CALLING', 'CONNECTED', 'COMPLETED', 'FAILED', 'CANCELLED']
- `startedAt`: Date (optional)
- `endedAt`: Date (optional)
- `durationSeconds`: Number (optional)
- `createdAt` / `updatedAt`: Date

## 6. Appointment
- `userId`: ObjectId -> User (required, indexed)
- `prescriptionId`: ObjectId -> Prescription (optional reference)
- `hospital`: String (required)
- `doctor`: String (optional)
- `requestedDate`: Date (required)
- `requestedTime`: String (optional)
- `status`: Enum ['REQUESTED', 'INQUIRING', 'CONFIRMED', 'CANCELLED']
- `source`: Enum ['USER_DIRECT', 'AI_ASSISTED']
- `notes`: String (optional)
- `createdAt` / `updatedAt`: Date

## 7. Conversation
- `userId`: ObjectId -> User (required, indexed)
- `messages`: Array of `{ role: Enum['user', 'assistant', 'system'], content: String, timestamp: Date }`
- `createdAt` / `updatedAt`: Date
