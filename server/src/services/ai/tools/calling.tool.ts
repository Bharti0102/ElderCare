import { AITool, ToolExecutionResult } from './tool.interface';
import { CallingService } from '../../calling/calling.service';

export class CallingTool implements AITool {
  public readonly name = 'calling_tool';
  public readonly description =
    'Initiates a telephone call to the user’s authorized caregiver or emergency contact.';

  private isHindiOrHinglish(text: string): boolean {
    return (
      /[\u0900-\u097F]/.test(text) ||
      /\b(call lagao|phone karo|dial karo|meri beti|mera beta|doctor ko|dawai|kripya|namaste)\b/i.test(text)
    );
  }

  private parseTarget(text: string): { relationship?: string; name?: string } {
    const lower = text.toLowerCase();

    // Hindi & English relationship mappings
    const relMap: Record<string, string> = {
      beti: 'daughter',
      daughter: 'daughter',
      beta: 'son',
      son: 'son',
      patni: 'wife',
      wife: 'wife',
      pati: 'husband',
      husband: 'husband',
      bhai: 'brother',
      brother: 'brother',
      behan: 'sister',
      sister: 'sister',
      maa: 'mother',
      mother: 'mother',
      pitaji: 'father',
      father: 'father',
      daktar: 'doctor',
      doctor: 'doctor',
      caregiver: 'caregiver',
      nurse: 'nurse',
      emergency: 'emergency',
    };

    for (const [key, normalized] of Object.entries(relMap)) {
      if (lower.includes(key)) {
        return { relationship: normalized };
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
    const isHindi = this.isHindiOrHinglish(rawInput);

    try {
      const call = await CallingService.initiateCaregiverCall(userId, parsed);

      const message = isHindi
        ? `📞 आपकी ${call.relationship}, **${call.contactName}** (${call.phoneNumber}) को कॉल लगाया जा रहा है। कृपया प्रतीक्षा करें!`
        : `📞 Calling your ${call.relationship}, **${call.contactName}** (${call.phoneNumber}). The phone line is connecting now!`;

      return {
        success: true,
        message,
        data: { call },
        suggestions: isHindi
          ? ['कॉल की स्थिति देखें', 'मुझे एक सुंदर कहानी सुनाइए', 'मेरे रिमाइंडर चेक करें']
          : ['View Calls tab', 'Tell me a gentle story', 'Check my reminders'],
      };
    } catch (err: any) {
      const errorMsg = isHindi
        ? `📞 कॉल कनेक्ट नहीं हो सकी: ${err.message || 'कृपया अपनी प्रोफ़ाइल में संपर्क नंबर जांचें।'}`
        : `📞 ${err.message || 'I could not complete the call. Please verify your emergency contacts in your Profile.'}`;

      return {
        success: false,
        message: errorMsg,
        suggestions: isHindi
          ? ['प्रोफ़ाइल में संपर्क जोड़ें', 'एक कहानी सुनाइए', 'पानी पीने का रिमाइंडर लगाएं']
          : ['Manage Contacts in Profile', 'Tell me a story', 'Remind me to drink water'],
      };
    }
  }
}

