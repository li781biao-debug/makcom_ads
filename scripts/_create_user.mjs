// One-off: create a User + TenantUser membership in the tenniix tenant.
// Reads EMAIL / PASSWORD / NAME / TENANT_SLUG from env. Idempotent — if user
// already exists, just adds the membership.
import bcrypt from "bcryptjs";
import { PrismaClient } from "./src/generated/prisma/client.js";

const EMAIL = process.env.NEW_EMAIL;
const PASSWORD = process.env.NEW_PASSWORD;
const NAME = process.env.NEW_NAME || null;
const TENANT_SLUG = process.env.TENANT_SLUG || "tenniix";

if (!EMAIL || !PASSWORD) {
  console.error("NEW_EMAIL and NEW_PASSWORD required");
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(PASSWORD, 10);

const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
if (!tenant) {
  console.error("Tenant slug not found: " + TENANT_SLUG);
  process.exit(2);
}

const user = await prisma.user.upsert({
  where: { email: EMAIL },
  update: { passwordHash: hash, name: NAME ?? undefined },
  create: { email: EMAIL, passwordHash: hash, name: NAME ?? undefined },
});

await prisma.tenantUser.upsert({
  where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
  update: {},
  create: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
});

console.log(JSON.stringify({
  userId: user.id,
  email: user.email,
  tenant: tenant.slug,
  ok: true,
}));
await prisma.$disconnect();
