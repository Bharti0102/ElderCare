import { LLMService } from './llm.service';
import { ChatTool } from './tools/chat.tool';
import { ChatService } from '../chat/chat.service';
import { KnownIntent } from '../../integrations/llm/llm.interface';

export interface OrchestratorResult {
  reply: string;
  intent: KnownIntent;
  confidence: number;
  suggestions: string[];
}

export class OrchestratorService {
  private static chatTool = new ChatTool();

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
        const previewReply =
          '⏰ I understand you would like to set a reminder. The automated Medication & Daily Reminders Agent will be enabled in Phase 3. For now, you can explore the Reminders preview tab!';
        await ChatService.addMessage(userId, 'user', trimmedInput, 'CREATE_REMINDER');
        await ChatService.addMessage(userId, 'assistant', previewReply, 'CREATE_REMINDER');
        return {
          reply: previewReply,
          intent: 'CREATE_REMINDER',
          confidence: intentResult.confidence,
          suggestions: ['Go to Reminders tab', 'Tell me a story', 'How are you today?'],
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
