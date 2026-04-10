import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { validateEnv } from '../env.js'

export type Role = 'admin' | 'it_staff' | 'end_user'

export interface JwtPayload {
  userId: number
  role: Role
  jti?: string
}

export function signToken(payload: JwtPayload, expiresIn: string | number = '8h'): string {
  const env = validateEnv()
  return jwt.sign({ ...payload, jti: randomUUID() }, env.JWT_SECRET, {
    expiresIn,
  } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  const env = validateEnv()
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}
