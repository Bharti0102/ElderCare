import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { signupSchema, loginSchema } from '../validators/auth.validator';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  public static async signup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = signupSchema.parse(req.body);
      const { user, token } = await AuthService.signup(validatedInput);

      res.cookie('token', token, COOKIE_OPTIONS);

      sendSuccess(
        res,
        { user, token },
        'Account registered successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  public static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(validatedInput);

      res.cookie('token', token, COOKIE_OPTIONS);

      sendSuccess(
        res,
        { user, token },
        'Signed in successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  public static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      });

      sendSuccess(res, null, 'Signed out successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async me(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const user = await AuthService.getCurrentUser(req.user.id);
      sendSuccess(res, { user }, 'Current user retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
