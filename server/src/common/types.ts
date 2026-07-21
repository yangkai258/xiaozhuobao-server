import { Role } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  region: string | null;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  region: string | null;
}

export interface ApiRequest extends Request {
  traceId: string;
  user?: AuthenticatedUser;
}
