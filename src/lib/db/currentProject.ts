import { cookies } from "next/headers";
import { prisma as basePrisma } from "@/lib/db";
import { listUserProjects } from "@/lib/db/projectClient";

const COOKIE_NAME = "current_project";

/**
 * Resolves the project (Tenant) the user is currently viewing.
 * Priority:
 *   1. ?project=<slug> URL param
 *   2. cookie "current_project" (slug)
 *   3. user's first project (by createdAt asc)
 * Returns null when user has no projects.
 */
export async function resolveCurrentProject(opts: {
  userId: string;
  urlSlug?: string | null;
}) {
  const projects = await listUserProjects(opts.userId);
  if (projects.length === 0) return { project: null, projects };

  // 1. URL param wins
  if (opts.urlSlug) {
    const fromUrl = projects.find((p) => p.slug === opts.urlSlug);
    if (fromUrl) return { project: fromUrl, projects };
  }

  // 2. cookie
  const c = await cookies();
  const cookieSlug = c.get(COOKIE_NAME)?.value;
  if (cookieSlug) {
    const fromCookie = projects.find((p) => p.slug === cookieSlug);
    if (fromCookie) return { project: fromCookie, projects };
  }

  // 3. default = first project
  return { project: projects[0], projects };
}

/**
 * Server action to persist project selection in a cookie.
 */
export async function setCurrentProjectCookie(slug: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, slug, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

/**
 * Resolve project by slug + verify user is a member (defense-in-depth).
 */
export async function assertUserProject(userId: string, slug: string) {
  const tenant = await basePrisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return null;
  const member = await basePrisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId } },
  });
  if (!member) return null;
  return tenant;
}
