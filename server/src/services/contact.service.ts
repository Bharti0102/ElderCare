import { Types } from 'mongoose';
import { EmergencyContact, IEmergencyContact } from '../models/EmergencyContact';
import { AppError } from '../utils/apiError';
import { CreateContactInput, UpdateContactInput } from '../validators/contact.validator';

export class ContactService {
  public static async createContact(
    userId: string,
    input: CreateContactInput
  ): Promise<IEmergencyContact> {
    const userObjectId = new Types.ObjectId(userId);

    // Check how many contacts exist for this user
    const existingCount = await EmergencyContact.countDocuments({ userId: userObjectId });

    // If first contact or isPrimary requested, ensure it's primary
    const shouldBePrimary = input.isPrimary || existingCount === 0;

    if (shouldBePrimary) {
      await EmergencyContact.updateMany(
        { userId: userObjectId, isPrimary: true },
        { $set: { isPrimary: false } }
      );
    }

    const contact = await EmergencyContact.create({
      userId: userObjectId,
      name: input.name,
      relationship: input.relationship,
      category: input.category || 'FAMILY',
      phone: input.phone,
      isPrimary: shouldBePrimary,
    });

    return contact;
  }

  public static async getContacts(userId: string, category?: string): Promise<IEmergencyContact[]> {
    const userObjectId = new Types.ObjectId(userId);
    const filter: any = { userId: userObjectId };
    if (category) {
      filter.category = category;
    }
    return EmergencyContact.find(filter)
      .sort({ isPrimary: -1, createdAt: -1 })
      .exec();
  }

  public static async getContactById(
    userId: string,
    contactId: string
  ): Promise<IEmergencyContact> {
    if (!Types.ObjectId.isValid(contactId)) {
      throw new AppError('Invalid contact ID format.', 400, 'INVALID_ID');
    }

    const contact = await EmergencyContact.findOne({
      _id: new Types.ObjectId(contactId),
      userId: new Types.ObjectId(userId),
    });

    if (!contact) {
      throw new AppError('Emergency contact not found.', 404, 'CONTACT_NOT_FOUND');
    }

    return contact;
  }

  public static async updateContact(
    userId: string,
    contactId: string,
    input: UpdateContactInput
  ): Promise<IEmergencyContact> {
    const contact = await this.getContactById(userId, contactId);
    const userObjectId = new Types.ObjectId(userId);

    if (input.isPrimary === true) {
      await EmergencyContact.updateMany(
        { userId: userObjectId, _id: { $ne: contact._id }, isPrimary: true },
        { $set: { isPrimary: false } }
      );
    }

    if (input.name !== undefined) contact.name = input.name;
    if (input.relationship !== undefined) contact.relationship = input.relationship;
    if (input.category !== undefined) contact.category = input.category;
    if (input.phone !== undefined) contact.phone = input.phone;
    if (input.isPrimary !== undefined) contact.isPrimary = input.isPrimary;

    await contact.save();
    return contact;

  }

  public static async deleteContact(
    userId: string,
    contactId: string
  ): Promise<void> {
    const contact = await this.getContactById(userId, contactId);
    const wasPrimary = contact.isPrimary;
    const userObjectId = new Types.ObjectId(userId);

    await EmergencyContact.deleteOne({ _id: contact._id });

    // If the primary contact was deleted, promote another contact if available
    if (wasPrimary) {
      const remainingContact = await EmergencyContact.findOne({ userId: userObjectId }).sort({ createdAt: -1 });
      if (remainingContact) {
        remainingContact.isPrimary = true;
        await remainingContact.save();
      }
    }
  }

  public static async setPrimaryContact(
    userId: string,
    contactId: string
  ): Promise<IEmergencyContact> {
    const contact = await this.getContactById(userId, contactId);
    const userObjectId = new Types.ObjectId(userId);

    // Demote all contacts for this user
    await EmergencyContact.updateMany(
      { userId: userObjectId, isPrimary: true },
      { $set: { isPrimary: false } }
    );

    // Promote target contact
    contact.isPrimary = true;
    await contact.save();

    return contact;
  }
}
