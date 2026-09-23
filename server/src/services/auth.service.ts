import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { env } from '../config/env';
import { AppError } from '../utils/apiError';
import { SignupInput, LoginInput } from '../validators/auth.validator';
import { AuthUser } from '../types/auth';

export class AuthService {
  private static generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
  }

  private static formatUserResponse(user: any): AuthUser {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
    };
  }

  public static async signup(
    input: SignupInput
  ): Promise<{ user: AuthUser; token: string }> {
    const existingUser = await User.findOne({ email: input.email }).lean();
    if (existingUser) {
      throw new AppError(
        'An account with this email address already exists.',
        409,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone || '',
    });

    const token = this.generateToken(user);
    return {
      user: this.formatUserResponse(user),
      token,
    };
  }

  public static async login(
    input: LoginInput
  ): Promise<{ user: AuthUser; token: string }> {
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user);
    return {
      user: this.formatUserResponse(user),
      token,
    };
  }

  public static async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return this.formatUserResponse(user);
  }
}
