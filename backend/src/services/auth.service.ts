import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { JwtPayload } from '../middleware/auth';

const BCRYPT_COST = 12;

export class AuthService {
  async register(email: string, username: string, password: string, fullName?: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      throw { statusCode: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email address already exists.', details: [{ field: 'email', message: 'This email is already registered.' }] };
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw { statusCode: 409, code: 'USERNAME_ALREADY_EXISTS', message: 'This username is already taken.', details: [{ field: 'username', message: 'This username is already taken.' }] };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        fullName: fullName || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    const dummyHash = '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QwqIAeApYfJvYIXn5vYKzKLOtOe';
    const match = user ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, dummyHash);

    if (!user || !match) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' };
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or has expired. Please log in again.' };
    }

    if (stored.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or has expired. Please log in again.' };
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(stored.user.id, stored.user.email);

    return { tokens };
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'User not found.' };
    return user;
  }

  async updateProfile(userId: string, data: { fullName?: string | null; avatarUrl?: string | null }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  }

  private async generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { sub: userId, email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const refreshTokenStr = uuidv4() + '-' + uuidv4();
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiresIn * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenStr,
      expiresIn: config.jwtExpiresIn,
    };
  }
}

export const authService = new AuthService();
