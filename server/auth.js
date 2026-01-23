import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from './storage.ts';

// CRITICAL: JWT_SECRET must be set in production for security
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set in production. ' +
      'Generate a strong secret with: openssl rand -base64 32'
    );
  }
  console.warn('⚠️  WARNING: JWT_SECRET not set, using development fallback (INSECURE)');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 12;

export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      epsiId: user.epsiId,
      orgId: user.orgId
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(email, password) {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export function extractTokenFromCookies(req) {
  return req.cookies?.auth_token || null;
}

export function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/', // Ensure cookie is sent on all routes including /uploads
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/', // Must match the path used in setAuthCookie
  });
}
