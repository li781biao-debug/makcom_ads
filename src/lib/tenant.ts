import { prisma } from "./db";

export async function getUserTenants(userId: string) {
  return prisma.tenantUser.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPrimaryTenant(userId: string) {
  const row = await prisma.tenantUser.findFirst({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  return row?.tenant ?? null;
}

export async function assertTenantMember(userId: string, tenantId: string) {
  const member = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!member) throw new Error("Forbidden: not a member of this tenant");
  return member;
}
