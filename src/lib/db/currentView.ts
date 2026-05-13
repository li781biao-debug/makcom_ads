import { cookies } from "next/headers";
import { prisma as basePrisma } from "@/lib/db";
import { listUserProjects, isSuperAdmin } from "@/lib/db/projectClient";

const COOKIE_NAME = "current_project"; // reused — works for both project & group slugs

export type ProjectRow = { id: string; slug: string; name: string; dbName: string };
export type GroupRow = {
  id: string;
  slug: string;
  name: string;
  projects: ProjectRow[];
};

export type View =
  | { kind: "project"; project: ProjectRow }
  | { kind: "group"; group: GroupRow };

/**
 * Returns every project and every group the user can pick from in the
 * switcher. SUPER_ADMIN sees everything; a regular USER sees a group only
 * when they have approved access to all its member projects.
 */
export async function listUserViews(userId: string): Promise<{
  projects: ProjectRow[];
  groups: GroupRow[];
}> {
  const projects = await listUserProjects(userId);
  const allGroups = await basePrisma.projectGroup.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: { tenant: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const accessibleProjectIds = new Set(projects.map((p) => p.id));
  const groups: GroupRow[] = allGroups
    .map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      projects: g.members
        .map((m) => m.tenant)
        .filter((t) => t.status === "active")
        .map((t) => ({ id: t.id, slug: t.slug, name: t.name, dbName: t.dbName })),
    }))
    .filter((g) =>
      g.projects.length > 0 && g.projects.every((p) => accessibleProjectIds.has(p.id)),
    );
  return {
    projects: projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name, dbName: p.dbName })),
    groups,
  };
}

/**
 * Resolve the current view (project or group). Lookup priority:
 *   1. urlSlug — first try group, then project
 *   2. cookie — same
 *   3. cookie / URL points at first available project
 * Returns null when the user has no accessible view at all.
 */
export async function resolveCurrentView(opts: {
  userId: string;
  urlSlug?: string | null;
}): Promise<{ view: View | null; views: { projects: ProjectRow[]; groups: GroupRow[] } }> {
  const views = await listUserViews(opts.userId);
  if (views.projects.length === 0 && views.groups.length === 0) {
    return { view: null, views };
  }

  function pickBySlug(slug: string | null | undefined): View | null {
    if (!slug) return null;
    const g = views.groups.find((x) => x.slug === slug);
    if (g) return { kind: "group", group: g };
    const p = views.projects.find((x) => x.slug === slug);
    if (p) return { kind: "project", project: p };
    return null;
  }

  // 1. URL
  const fromUrl = pickBySlug(opts.urlSlug);
  if (fromUrl) return { view: fromUrl, views };

  // 2. Cookie
  const c = await cookies();
  const cookieSlug = c.get(COOKIE_NAME)?.value;
  const fromCookie = pickBySlug(cookieSlug);
  if (fromCookie) return { view: fromCookie, views };

  // 3. Default — first project, else first group
  if (views.projects[0]) return { view: { kind: "project", project: views.projects[0] }, views };
  return { view: { kind: "group", group: views.groups[0] }, views };
}

/**
 * Verify user can access the named view (project or group).
 */
export async function assertUserView(userId: string, slug: string): Promise<View | null> {
  const admin = await isSuperAdmin(userId);
  // Try group first
  const group = await basePrisma.projectGroup.findUnique({
    where: { slug },
    include: { members: { include: { tenant: true } } },
  });
  if (group) {
    const members = group.members
      .map((m) => m.tenant)
      .filter((t) => t.status === "active");
    if (!admin) {
      const memberships = await basePrisma.tenantUser.findMany({
        where: { userId, tenantId: { in: members.map((m) => m.id) } },
        select: { tenantId: true },
      });
      const accessible = new Set(memberships.map((m) => m.tenantId));
      const ok = members.every((m) => accessible.has(m.id));
      if (!ok) return null;
    }
    return {
      kind: "group",
      group: {
        id: group.id,
        slug: group.slug,
        name: group.name,
        projects: members.map((t) => ({ id: t.id, slug: t.slug, name: t.name, dbName: t.dbName })),
      },
    };
  }
  // Else project
  const tenant = await basePrisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status !== "active") return null;
  if (!admin) {
    const member = await basePrisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
    });
    if (!member) return null;
  }
  return {
    kind: "project",
    project: { id: tenant.id, slug: tenant.slug, name: tenant.name, dbName: tenant.dbName },
  };
}
