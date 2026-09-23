import { LLMService } from './llm.service';
import { ChatTool } from './tools/chat.tool';
import { ReminderTool } from './tools/reminder.tool';
import { ChatService } from '../chat/chat.service';
import { KnownIntent } from '../../integrations/llm/llm.interface';

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

  public static async processMessage(
    userId: string,
    userInput: string
  ): Promise<OrchestratorResult> {
    const trimmedInput = userInput.trim();

    // 1. Identify intent
    const intentResult = await LLMService.classifyIntent(trimmedInput);
    const intent = intentResult.intent;

    // 2. Route according to intent
    switch (intent) {
      case 'CHAT': {
        const toolResult = await this.chatTool.execute(userId, { message: trimmedInput });
        return {
          reply: toolResult.message,
          intent: 'CHAT',
          confidence: intentResult.confidence,
          suggestions: toolResult.suggestions || [],
        };
      }

      case 'CREATE_REMINDER': {
        // Record user intent in dialogue stream
        await ChatService.addMessage(userId, 'user', trimmedInput, 'CREATE_REMINDER');

        // Execute reminder creation via validated ReminderTool
        const toolResult = await this.reminderTool.execute(userId, { message: trimmedInput });

        // Record assistant response
        await ChatService.addMessage(userId, 'assistant', toolResult.message, 'CREATE_REMINDER');

        return {
          reply: toolResult.message,
          intent: 'CREATE_REMINDER',
          confidence: intentResult.confidence,
          toolResults: [toolResult],
          suggestions: toolResult.suggestions || ['View my reminders', 'Remind me to drink water', 'Tell me a story'],
        };
      }

      case 'CALL_CAREGIVER': {
        const previewReply =
          '📞 I recognized your request to contact your family caregiver. Voice telephony calling will be activated in Phase 5. In the meantime, you can manage your verified primary contacts in your Profile!';
        await ChatService.addMessage(userId, 'user', trimmedInput, 'CALL_CAREGIVER');
        await ChatService.addMessage(userId, 'assistant', previewReply, 'CALL_CAREGIVER');
        return {
          reply: previewReply,
          intent: 'CALL_CAREGIVER',
          confidence: intentResult.confidence,
          suggestions: ['View emergency contacts in Profile', 'Tell me a calming story', 'Who is my daughter?'],
        };
      }

      case 'PRESCRIPTION': {
        const previewReply =
          '📋 I noticed you are asking about a prescription or medicine dosage. The Prescription OCR & Vision Intelligence workflow will be activated in Phase 4. Please ensure you consult your doctor or verified caregiver before altering any medications.';
        await ChatService.addMessage(userId, 'user', trimmedInput, 'PRESCRIPTION');
        await ChatService.addMessage(userId, 'assistant', previewReply, 'PRESCRIPTION');
        return {
          reply: previewReply,
          intent: 'PRESCRIPTION',
          confidence: intentResult.confidence,
          suggestions: ['View Prescriptions tab', 'Call my doctor', 'Tell me a gentle story'],
        };
      }

      case 'HOSPITAL_CALL': {
        const previewReply =
          '🏥 I understand you wish to contact a hospital or schedule an appointment. Autonomous and assisted hospital calling will be available in Phase 6.';
        await ChatService.addMessage(userId, 'user', trimmedInput, 'HOSPITAL_CALL');
        await ChatService.addMessage(userId, 'assistant', previewReply, 'HOSPITAL_CALL');
        return {
          reply: previewReply,
          intent: 'HOSPITAL_CALL',
          confidence: intentResult.confidence,
          suggestions: ['View Calls tab', 'Who is my doctor?', 'Tell me a story'],
        };
      }

      default: {
        const toolResult = await this.chatTool.execute(userId, { message: trimmedInput });
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
