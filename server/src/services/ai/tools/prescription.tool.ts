import { AITool, ToolExecutionResult } from './tool.interface';
import { PrescriptionService } from '../../prescription/prescription.service';

export class PrescriptionTool implements AITool {
  public readonly name = 'prescription_tool';
  public readonly description =
    'Answers inquiries about uploaded prescriptions, verified medications, dosages, and hospital contacts.';

  public async execute(
    userId: string,
    parameters: { message?: string }
  ): Promise<ToolExecutionResult> {
    const prescriptions = await PrescriptionService.getPrescriptions(userId);

    if (prescriptions.length === 0) {
      return {
        success: true,
        message:
          '📋 You currently have no prescription records uploaded in ElderCare AI. You can upload an image or PDF of your doctor prescription in the Prescriptions tab, and I will help organize your medicines and reminders!',
        suggestions: ['Upload a prescription', 'Remind me to drink water', 'Tell me a gentle story'],
      };
    }

    const latest = prescriptions[0];
    const doctorStr = latest.doctor?.name ? `with **${latest.doctor.name}**` : '';
    const hospitalStr = latest.hospital?.name ? `at **${latest.hospital.name}**` : '';
    const phoneStr = latest.receptionPhone ? `(Reception: ${latest.receptionPhone})` : '';

    const medLines =
      latest.medicines.length > 0
        ? latest.medicines
            .map(
              (m, idx) =>
                `${idx + 1}. **${m.name}** ${m.dosage ? `(${m.dosage})` : ''} — ${m.frequency || ''} ${
                  m.instructions ? `[${m.instructions}]` : ''
                }`
            )
            .join('\n')
        : 'No specific medications listed.';

    const reply =
      `📋 Here are the details from your latest prescription ${doctorStr} ${hospitalStr} ${phoneStr}:\n\n` +
      `**Status**: ${latest.status}\n\n` +
      `**Medications**:\n${medLines}\n\n` +
      `⚠️ *Please note: I cannot modify your dosages or diagnose conditions. Always follow your doctor's exact instructions.*`;

    return {
      success: true,
      message: reply,
      data: { prescription: latest },
      suggestions: [
        'Create reminders for my medicines',
        'Call doctor reception',
        'Tell me a calming story',
      ],
    };
  }
}
