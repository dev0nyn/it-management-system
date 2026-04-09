import jwt from 'jsonwebtoken'
import { validateEnv } from '../env.js'

export type Role = 'admin' | 'it_staff' | 'end_user'

export interface JwtPayload {
  userId: number
  role: Role
}

export function signToken(payload: JwtPayload, expiresIn: string | number = '8h'): string {
  const env = validateEnv()
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  const env = validateEnv()
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}
