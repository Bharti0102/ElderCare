import { AITool, ToolExecutionResult } from './tool.interface';
import { HospitalService } from '../../calling/hospital.service';

export class HospitalTool implements AITool {
  public readonly name = 'hospital_tool';
  public readonly description =
    'Connects the user to hospital reception or initiates an AI assistant booking call to discover appointment availability.';

  public async execute(
    userId: string,
    parameters: { message?: string }
  ): Promise<ToolExecutionResult> {
    const rawInput = parameters.message || '';

    try {
      // 1. Resolve hospital from prescription records
      const target = await HospitalService.resolveHospitalTarget(userId);

      // 2. Perform AI Reception Inquiry (Mode B)
      const callResult = await HospitalService.initiateAICall(userId, {
        hospital: target.hospital,
        doctor: target.doctor,
        receptionPhone: target.receptionPhone,
        prescriptionId: target.prescriptionId?.toString(),
        patientNotes: rawInput,
      });

      return {
        success: true,
        message: `${callResult.summary}\n\nYou can review and confirm this booking on the Calls page under Hospital & Appointments.`,
        data: {
          appointment: callResult.appointment,
          call: callResult.call,
          aiTranscript: callResult.aiTranscript,
        },
        suggestions: [
          'Confirm this appointment',
          'View Hospital Appointments',
          'Tell me a gentle story',
        ],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `🏥 ${
          err.message ||
          'I could not locate hospital reception details. Please upload your prescription in the Prescriptions tab or enter hospital details in the Calls page.'
        }`,
        suggestions: [
          'Upload Prescription',
          'View Calls tab',
          'Call my caregiver',
        ],
      };
    }
  }
}
