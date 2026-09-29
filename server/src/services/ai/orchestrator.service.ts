import { LLMService } from './llm.service';
import { ChatTool } from './tools/chat.tool';
import { ReminderTool } from './tools/reminder.tool';
import { PrescriptionTool } from './tools/prescription.tool';
import { CallingTool } from './tools/calling.tool';
import { HospitalTool } from './tools/hospital.tool';
import { ChatService } from '../chat/chat.service';
import { KnownIntent } from '../../integrations/llm/llm.interface';

export interface OrchestratorOptions {
  sessionId?: string;
  language?: string;
}

export interface OrchestratorResult {
  reply: string;
  intent: KnownIntent;
  confidence: number;
  suggestions: string[];
  toolResults?: any[];
}

export class OrchestratorService {
  private static chatTool = new ChatTool();
  private static reminderTool = new ReminderTool();
  private static prescriptionTool = new PrescriptionTool();
  private static callingTool = new CallingTool();
  private static hospitalTool = new HospitalTool();

  public static async processMessage(
    userId: string,
    userInput: string,
    options?: OrchestratorOptions
  ): Promise<OrchestratorResult> {
    const trimmedInput = userInput.trim();
    const sessionId = options?.sessionId;
    const language = options?.language;

    // 1. Identify intent
    const intentResult = await LLMService.classifyIntent(trimmedInput);
    const intent = intentResult.intent;

    // 2. Route according to intent
    switch (intent) {
      case 'CHAT': {
        const toolResult = await this.chatTool.execute(userId, {
          message: trimmedInput,
          sessionId,
          language,
        });
        return {
          reply: toolResult.message,
          intent: 'CHAT',
          confidence: intentResult.confidence,
          suggestions: toolResult.suggestions || [],
        };
      }

      case 'CREATE_REMINDER': {
        // Record user intent in dialogue stream
        await ChatService.addMessage(userId, 'user', trimmedInput, 'CREATE_REMINDER', sessionId);

        // Execute reminder creation via validated ReminderTool
        const toolResult = await this.reminderTool.execute(userId, { message: trimmedInput });

        // Record assistant response
        await ChatService.addMessage(userId, 'assistant', toolResult.message, 'CREATE_REMINDER', sessionId);

        return {
          reply: toolResult.message,
          intent: 'CREATE_REMINDER',
          confidence: intentResult.confidence,
          toolResults: [toolResult],
          suggestions: toolResult.suggestions || ['View my reminders', 'Remind me to drink water', 'Tell me a story'],
        };
      }

      case 'CALL_CAREGIVER': {
        await ChatService.addMessage(userId, 'user', trimmedInput, 'CALL_CAREGIVER', sessionId);
        const toolResult = await this.callingTool.execute(userId, { message: trimmedInput });
        await ChatService.addMessage(userId, 'assistant', toolResult.message, 'CALL_CAREGIVER', sessionId);
        return {
          reply: toolResult.message,
          intent: 'CALL_CAREGIVER',
          confidence: intentResult.confidence,
          toolResults: [toolResult],
          suggestions: toolResult.suggestions || ['View Calls tab', 'Tell me a calming story', 'Who is my daughter?'],
        };
      }

      case 'PRESCRIPTION': {
        await ChatService.addMessage(userId, 'user', trimmedInput, 'PRESCRIPTION', sessionId);
        const toolResult = await this.prescriptionTool.execute(userId, { message: trimmedInput });
        await ChatService.addMessage(userId, 'assistant', toolResult.message, 'PRESCRIPTION', sessionId);
        return {
          reply: toolResult.message,
          intent: 'PRESCRIPTION',
          confidence: intentResult.confidence,
          toolResults: [toolResult],
          suggestions: toolResult.suggestions || ['View Prescriptions tab', 'Call my doctor', 'Tell me a gentle story'],
        };
      }

      case 'HOSPITAL_CALL': {
        await ChatService.addMessage(userId, 'user', trimmedInput, 'HOSPITAL_CALL', sessionId);
        const toolResult = await this.hospitalTool.execute(userId, { message: trimmedInput });
        await ChatService.addMessage(userId, 'assistant', toolResult.message, 'HOSPITAL_CALL', sessionId);
        return {
          reply: toolResult.message,
          intent: 'HOSPITAL_CALL',
          confidence: intentResult.confidence,
          toolResults: [toolResult],
          suggestions: toolResult.suggestions || ['Confirm this appointment', 'View Calls tab', 'Tell me a story'],
        };
      }

      default: {
        const toolResult = await this.chatTool.execute(userId, {
          message: trimmedInput,
          sessionId,
          language,
        });
        return {
          reply: toolResult.message,
          intent: 'CHAT',
          confidence: intentResult.confidence,
          suggestions: toolResult.suggestions || [],
        };
      }
    }
  }
}
