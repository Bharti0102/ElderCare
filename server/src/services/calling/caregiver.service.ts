import { EmergencyContact, IEmergencyContact } from '../../models/EmergencyContact';
import { AppError } from '../../utils/apiError';

export class CaregiverService {
  /**
   * Resolves the requested caregiver / emergency contact for the user.
   * Invariant: Never invents or hardcodes phone numbers. Resolves strictly from verified contacts.
   */
  public static async resolveCaregiver(
    userId: string,
    target?: { relationship?: string; name?: string; contactId?: string }
  ): Promise<IEmergencyContact> {
    // 1. By direct contactId if provided
    if (target?.contactId) {
      const contact = await EmergencyContact.findOne({
        _id: target.contactId,
        userId,
      });
      if (contact) return contact;
    }

    // 2. By Relationship (e.g. "daughter", "son", "doctor")
    if (target?.relationship) {
      const relRegex = new RegExp(target.relationship.trim(), 'i');
      const contact = await EmergencyContact.findOne({
        userId,
        relationship: { $regex: relRegex },
      });
      if (contact) return contact;
    }

    // 3. By Name (e.g. "Sarah")
    if (target?.name) {
      const nameRegex = new RegExp(target.name.trim(), 'i');
      const contact = await EmergencyContact.findOne({
        userId,
        name: { $regex: nameRegex },
      });
      if (contact) return contact;
    }

    // If a specific target was requested but not found, reject safely without dialing the wrong person
    if (target?.relationship || target?.name || target?.contactId) {
      const queryName = target.relationship || target.name || 'requested contact';
      throw new AppError(
        `No emergency contact found matching "${queryName}". Please add them to your emergency contacts in your Profile before placing a call.`,
        404,
        'CAREGIVER_NOT_FOUND'
      );
    }

    // 4. Default: User's Primary Caregiver (when user says "call my caregiver" or "emergency call")
    const primary = await EmergencyContact.findOne({
      userId,
      isPrimary: true,
    });
    if (primary) return primary;

    // 5. Fallback: Any first contact on file
    const anyContact = await EmergencyContact.findOne({ userId });
    if (anyContact) return anyContact;

    // No contacts configured at all
    throw new AppError(
      'No emergency contacts found in your profile. Please add your family caregiver or doctor in your Profile before placing a call.',
      404,
      'CAREGIVER_NOT_FOUND'
    );
  }
}
