import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  tenantName: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, name, tenantName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const u = await tx.user.create({ data: { email, name, passwordHash } });
    const t = await tx.tenant.create({ data: { name: tenantName } });
    await tx.tenantUser.create({
      data: { tenantId: t.id, userId: u.id, role: "OWNER" },
    });
    return u;
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
