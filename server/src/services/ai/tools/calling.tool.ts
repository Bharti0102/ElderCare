import { AITool, ToolExecutionResult } from './tool.interface';
import { CallingService } from '../../calling/calling.service';

export class CallingTool implements AITool {
  public readonly name = 'calling_tool';
  public readonly description =
    'Initiates a telephone call to the user’s authorized caregiver or emergency contact.';

  private parseTarget(text: string): { relationship?: string; name?: string } {
    const lower = text.toLowerCase();

    // Check common family relationships
    const relationships = [
      'daughter',
      'son',
      'doctor',
      'caregiver',
      'nurse',
      'wife',
      'husband',
      'sister',
      'brother',
      'mother',
      'father',
      'emergency',
    ];

    for (const rel of relationships) {
      if (lower.includes(rel)) {
        return { relationship: rel };
      }
    }

    // Clean extraction of name or role after "call" / "call my" / "dial" / "ring"
    const match = text.match(/(?:call|dial|ring|contact)\s+(?:my\s+)?([A-Za-z]+)/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const candidateLower = candidate.toLowerCase();
      if (!['please', 'someone', 'somebody', 'now', 'quickly', 'up'].includes(candidateLower)) {
        return { name: candidate };
      }
    }

    return {};
  }

  public async execute(
    userId: string,
    parameters: { message?: string }
  ): Promise<ToolExecutionResult> {
    const rawInput = parameters.message || '';
    const parsed = this.parseTarget(rawInput);

    try {
      const call = await CallingService.initiateCaregiverCall(userId, parsed);

      return {
        success: true,
        message: `📞 Calling your ${call.relationship}, **${call.contactName}** (${call.phoneNumber}). The phone line is connecting now!`,
        data: { call },
        suggestions: [
          'View Calls tab',
          'Tell me a gentle story',
          'Check my reminders',
        ],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `📞 ${
          err.message ||
          'I could not complete the call. Please verify your emergency contacts in your Profile.'
        }`,
        suggestions: [
          'Manage Contacts in Profile',
          'Tell me a story',
          'Remind me to drink water',
        ],
      };
    }
  }
}
