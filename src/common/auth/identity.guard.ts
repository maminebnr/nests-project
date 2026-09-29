import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import { AuthedRequest, AuthUser, Role, ROLES } from './auth.types';

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/**
 * Global guard. Identity comes from `x-user-id`, `x-user-name`, `x-user-role`
 * headers so the Review module is usable end-to-end today.
 *
 * ⚠️ Replace `resolveUser` with real JWT / session validation before going to
 * production - everything else (decorators, roles) stays the same.
 */
@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);

    const user = this.resolveUser(req, !isPublic);
    if (user) req.user = user;
    if (isPublic && !roles) return true;

    if (!user) throw new UnauthorizedException('Missing x-user-id header');
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException(`Requires role: ${roles.join(' | ')}`);
    }
    return true;
  }

  protected resolveUser(req: AuthedRequest, strict: boolean): AuthUser | undefined {
    const id = first(req.headers['x-user-id']);
    if (!id) return undefined;
    if (!/^[\w.-]{1,64}$/.test(id)) {
      if (strict) throw new UnauthorizedException('Invalid x-user-id');
      return undefined;
    }
    const role = (first(req.headers['x-user-role']) ?? 'member') as Role;
    if (!ROLES.includes(role)) {
      if (strict) throw new UnauthorizedException('Invalid x-user-role');
      return undefined;
    }
    const name = (first(req.headers['x-user-name']) ?? id).slice(0, 80);
    return { id, name, role };
  }
}
