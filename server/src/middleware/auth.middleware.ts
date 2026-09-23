import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/apiError';
import { AuthenticatedRequest, AuthUser } from '../types/auth';

interface JwtPayload {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check cookies first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check Authorization header fallback
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
    }

    // Check if user still exists
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      throw new AppError('The account for this token no longer exists.', 401, 'USER_NOT_FOUND');
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    next();
  } catch (error) {
    next(error);
  }
};
