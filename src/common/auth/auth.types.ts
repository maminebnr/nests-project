import type { Request } from 'express';

export type Role = 'member' | 'librarian' | 'admin';

export const ROLES: readonly Role[] = ['member', 'librarian', 'admin'];

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

export type AuthedRequest = Request & { user?: AuthUser };

export const isStaff = (user?: AuthUser): boolean =>
  user?.role === 'librarian' || user?.role === 'admin';
