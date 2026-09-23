import fs from 'fs';
import path from 'path';
import { Prescription, IPrescription } from '../../models/Prescription';
import { OCRFactory } from '../../integrations/ocr';
import { ReminderService } from '../reminder/reminder.service';
import {
  ConfirmPrescriptionInput,
  CreateRemindersFromPrescriptionInput,
} from '../../validators/prescription.validator';
import { AppError } from '../../utils/apiError';
import { ReminderRepeat } from '../../models/Reminder';

export class PrescriptionService {
  /**
   * Process uploaded prescription file through OCR and save initial analyzed record.
   */
  public static async uploadAndAnalyze(
    userId: string,
    file: Express.Multer.File
  ): Promise<IPrescription> {
    if (!file) {
      throw new AppError('No prescription file uploaded', 400, 'FILE_MISSING');
    }

    const ocrProvider = OCRFactory.getProvider();
    const extracted = await ocrProvider.extractPrescription(
      file.path,
      file.mimetype,
      file.originalname
    );

    const relativeUrl = `/uploads/prescriptions/${file.filename}`;

    const prescription = await Prescription.create({
      userId,
      fileUrl: relativeUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      doctor: extracted.doctor,
      hospital: extracted.hospital,
      receptionPhone: extracted.receptionPhone,
      prescriptionDate: extracted.prescriptionDate || new Date(),
      medicines: extracted.medicines,
      rawText: extracted.rawText,
      confidence: extracted.confidence,
      status: 'ANALYZED',
    });

    return prescription;
  }

  /**
   * Retrieve all prescriptions for an authenticated user.
   */
  public static async getPrescriptions(userId: string): Promise<IPrescription[]> {
    return Prescription.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Retrieve a specific prescription by ID.
   */
  public static async getPrescriptionById(
    userId: string,
    prescriptionId: string
  ): Promise<IPrescription> {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      userId,
    });

    if (!prescription) {
      throw new AppError('Prescription record not found', 404, 'NOT_FOUND');
    }

    return prescription;
  }

  /**
   * Human / Caregiver review and confirmation of extracted prescription details.
   */
  public static async confirmPrescription(
    userId: string,
    prescriptionId: string,
    input: ConfirmPrescriptionInput
  ): Promise<IPrescription> {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      userId,
    });

    if (!prescription) {
      throw new AppError('Prescription record not found', 404, 'NOT_FOUND');
    }

    if (input.doctor) prescription.doctor = input.doctor;
    if (input.hospital) prescription.hospital = input.hospital;
    if (input.receptionPhone !== undefined) prescription.receptionPhone = input.receptionPhone;
    if (input.prescriptionDate) {
      prescription.prescriptionDate = new Date(input.prescriptionDate);
    }
    prescription.medicines = input.medicines;
    prescription.status = 'CONFIRMED';

    await prescription.save();
    return prescription;
  }

  /**
   * Bridge confirmed prescription medicines into scheduled reminders in ReminderService.
   */
  public static async bridgeToReminders(
    userId: string,
    prescriptionId: string,
    options?: CreateRemindersFromPrescriptionInput
  ): Promise<any[]> {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      userId,
    });

    if (!prescription) {
      throw new AppError('Prescription record not found', 404, 'NOT_FOUND');
    }

    if (prescription.medicines.length === 0) {
      throw new AppError('No medicines available on this prescription to schedule', 400, 'NO_MEDICINES');
    }

    // Determine target medicines to schedule
    let targetMedicines = prescription.medicines;
    if (options?.medicineIndices && options.medicineIndices.length > 0) {
      targetMedicines = options.medicineIndices
        .map((idx) => prescription.medicines[idx])
        .filter(Boolean);
    }

    const createdReminders = [];

    // Base scheduled time
    let targetHour = 9; // 9:00 AM default
    let targetMinute = 0;

    if (options?.preferredTime) {
      const parts = options.preferredTime.split(':');
      targetHour = parseInt(parts[0], 10);
      targetMinute = parseInt(parts[1], 10);
    }

    for (let i = 0; i < targetMedicines.length; i++) {
      const med = targetMedicines[i];
      const scheduledAt = new Date();
      scheduledAt.setHours(targetHour, targetMinute + i * 5, 0, 0);

      // If scheduled time has already passed today, advance to tomorrow
      if (scheduledAt.getTime() <= Date.now()) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      // Detect repeat rule
      let repeat: ReminderRepeat = 'daily';
      const freq = (med.frequency || '').toLowerCase();
      if (freq.includes('week')) {
        repeat = 'weekly';
      } else if (freq.includes('month')) {
        repeat = 'monthly';
      } else if (freq.includes('once') && !freq.includes('daily')) {
        repeat = 'none';
      }

      const title = med.dosage ? `${med.name} (${med.dosage})` : med.name;
      const descParts = [];
      if (med.instructions) descParts.push(med.instructions);
      if (med.frequency) descParts.push(`Sig: ${med.frequency}`);
      if (prescription.doctor?.name) descParts.push(`Prescribed by: ${prescription.doctor.name}`);

      const reminder = await ReminderService.createReminder(userId, {
        title,
        description: descParts.join(' | ') || 'Prescribed medication',
        category: 'MEDICATION',
        scheduledAt,
        repeat,
      });

      createdReminders.push(reminder);
    }

    return createdReminders;
  }

  /**
   * Delete prescription record and cleanup uploaded file.
   */
  public static async deletePrescription(
    userId: string,
    prescriptionId: string
  ): Promise<void> {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      userId,
    });

    if (!prescription) {
      throw new AppError('Prescription record not found', 404, 'NOT_FOUND');
    }

    // Try deleting physical file
    try {
      const absolutePath = path.join(process.cwd(), prescription.fileUrl);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (err) {
      console.warn('[PrescriptionService] Unable to unlink physical file:', err);
    }

    await prescription.deleteOne();
  }
}
