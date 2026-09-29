import { Response, NextFunction } from 'express';
import { ContactService } from '../services/contact.service';
import { createContactSchema, updateContactSchema } from '../validators/contact.validator';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

export class ContactController {
  public static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = createContactSchema.parse(req.body);
      const contact = await ContactService.createContact(req.user!.id, validatedInput);
      sendSuccess(res, { contact }, 'Emergency contact added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const category = req.query.category ? String(req.query.category) : undefined;
      const contacts = await ContactService.getContacts(req.user!.id, category);
      sendSuccess(res, { contacts }, 'Emergency contacts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const contactId = String(req.params.id);
      const contact = await ContactService.getContactById(req.user!.id, contactId);
      sendSuccess(res, { contact }, 'Emergency contact retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const contactId = String(req.params.id);
      const validatedInput = updateContactSchema.parse(req.body);
      const contact = await ContactService.updateContact(
        req.user!.id,
        contactId,
        validatedInput
      );
      sendSuccess(res, { contact }, 'Emergency contact updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const contactId = String(req.params.id);
      await ContactService.deleteContact(req.user!.id, contactId);
      sendSuccess(res, null, 'Emergency contact deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async setPrimary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const contactId = String(req.params.id);
      const contact = await ContactService.setPrimaryContact(req.user!.id, contactId);
      sendSuccess(res, { contact }, 'Primary contact updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
