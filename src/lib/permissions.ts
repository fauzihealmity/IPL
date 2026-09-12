import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export class UnauthorizedError extends Error {
  code = "UNAUTHORIZED";
  status = 401;
}

export class ForbiddenError extends Error {
  code = "FORBIDDEN";
  status = 403;
}

export type AuthSession = Awaited<ReturnType<typeof getServerSession>> & {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    residentId: string | null;
  };
};

/**
 * Use inside Server Actions / Route Handlers where you want to throw
 * a structured error instead of redirecting (e.g. API responses).
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new UnauthorizedError("Anda harus login untuk mengakses ini.");
  }
  return session as AuthSession;
}

export async function requireRole(roles: UserRole[]): Promise<AuthSession> {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError("Anda tidak memiliki akses untuk fitur ini.");
  }
  return session;
}

export async function requireAdmin(): Promise<AuthSession> {
  return requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
}

export async function requireSuperAdmin(): Promise<AuthSession> {
  return requireRole([UserRole.SUPER_ADMIN]);
}

/**
 * Resident-only endpoints. Returns the session including a guaranteed
 * non-null residentId so callers can scope queries safely, e.g.:
 *   WHERE residentId = session.user.residentId
 * Never fetch resident-owned records (invoices, payments, complaints)
 * by ID alone without this ownership check.
 */
export async function requireResident(): Promise<
  AuthSession & { user: { residentId: string } }
> {
  const session = await requireRole([UserRole.RESIDENT]);
  if (!session.user.residentId) {
    throw new ForbiddenError("Akun ini belum tertaut ke data warga.");
  }
  return session as AuthSession & { user: { residentId: string } };
}

/**
 * Use inside Server Components / Pages where an unauthenticated or
 * unauthorized user should simply be redirected rather than handled
 * with a thrown error.
 */
export async function requireAuthOrRedirect() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session as AuthSession;
}

export async function requireRoleOrRedirect(roles: UserRole[]) {
  const session = await requireAuthOrRedirect();
  if (!roles.includes(session.user.role)) {
    redirect("/login");
  }
  return session;
}
