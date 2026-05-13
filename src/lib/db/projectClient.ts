import { PrismaClient } from "@/generated/prisma-project/client";
import { prisma as basePrisma } from "@/lib/db";

// Cache one PrismaClient per project DB so we don't reopen connections per request.
const cache = new Map<string, PrismaClient>();

function makeProjectUrl(dbName: string): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL not set");
  // Replace the database name segment of the URL.
  // e.g. mysql://root:pw@host:3306/makcom_ads?foo=1 → mysql://root:pw@host:3306/<dbName>?foo=1
  return base.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`);
}

export function projectClient(dbName: string): PrismaClient {
  let c = cache.get(dbName);
  if (!c) {
    c = new PrismaClient({
      datasourceUrl: makeProjectUrl(dbName),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    cache.set(dbName, c);
  }
  return c;
}

// Resolve a project (Tenant row) by slug or id, returning its dbName.
export async function resolveProjectBySlug(slug: string) {
  return basePrisma.tenant.findUnique({ where: { slug } });
}

export async function resolveProjectById(id: string) {
  return basePrisma.tenant.findUnique({ where: { id } });
}

// Returns Tenant rows the user has access to. SUPER_ADMIN sees every active
// tenant; regular USER sees only tenants where they have an approved
// TenantUser membership.
export async function listUserProjects(userId: string) {
  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "SUPER_ADMIN") {
    return basePrisma.tenant.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "asc" },
    });
  }
  const memberships = await basePrisma.tenantUser.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships
    .map((m) => m.tenant)
    .filter((t) => t.status === "active");
}

// True if the user is a SUPER_ADMIN (cached per request via Next/React data cache).
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const u = await basePrisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return u?.role === "SUPER_ADMIN";
}
