import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

describe('Auth Service - Unit Tests', () => {
  describe('Password Hashing', () => {
    it('should generate a bcrypt hash starting with $2b$', async () => {
      const hash = await bcrypt.hash('Test@12345', 12);
      expect(hash).toMatch(/^\$2b\$12\$/);
    });

    it('should verify correct password against hash', async () => {
      const password = 'Test@12345';
      const hash = await bcrypt.hash(password, 12);
      const match = await bcrypt.compare(password, hash);
      expect(match).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash('Test@12345', 12);
      const match = await bcrypt.compare('WrongPassword1!', hash);
      expect(match).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate a valid JWT with correct sub and exp', () => {
      const token = jwt.sign(
        { sub: 'user-uuid', email: 'test@example.com' },
        config.jwtSecret,
        { expiresIn: 900 }
      );

      const decoded = jwt.verify(token, config.jwtSecret) as any;
      expect(decoded.sub).toBe('user-uuid');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should throw TokenExpiredError for expired token', () => {
      const token = jwt.sign(
        { sub: 'user-uuid', email: 'test@example.com' },
        config.jwtSecret,
        { expiresIn: '0s' }
      );

      expect(() => jwt.verify(token, config.jwtSecret)).toThrow();
    });
  });
});
