import { Request } from 'express';
import { IUser } from '../models/User';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
