import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { AuthedRequest, AuthUser, Role } from './auth.types';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';

/** Route can be called anonymously (identity is still read when supplied). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Route requires one of the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user (undefined on anonymous public routes). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);

/** Documents the temporary header-based identity in Swagger. */
export const ApiIdentity = () =>
  applyDecorators(
    ApiHeader({ name: 'x-user-id', required: false, description: 'User id (e.g. u-100)' }),
    ApiHeader({ name: 'x-user-name', required: false, description: 'Display name' }),
    ApiHeader({
      name: 'x-user-role',
      required: false,
      enum: ['member', 'librarian', 'admin'],
      description: 'Defaults to member',
    }),
  );
