import { NextResponse } from "next/server";
import { prisma as basePrisma } from "@/lib/db";
import { projectClient } from "@/lib/db/projectClient";
import type { PrismaClient } from "@/generated/prisma-project/client";

export type ProjectContext = { tenantId: string; client: PrismaClient };

/**
 * Resolve which project DB to write to based on body.project_slug (preferred)
 * or body.tenant_id (legacy). Returns the project's tenantId (used as the
 * row-level tenantId column inside the project DB) and a PrismaClient for it.
 */
export async function resolveProject(body: {
  project_slug?: string;
  tenant_id?: string;
}): Promise<ProjectContext | NextResponse> {
  let tenant = null;
  if (body.project_slug) {
    tenant = await basePrisma.tenant.findUnique({
      where: { slug: body.project_slug },
    });
  }
  if (!tenant && body.tenant_id) {
    tenant = await basePrisma.tenant.findUnique({
      where: { id: body.tenant_id },
    });
  }
  if (!tenant) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Unknown project_slug or tenant_id" },
      },
      { status: 404 },
    );
  }
  if (tenant.status !== "active") {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "PROJECT_INACTIVE", message: `Project ${tenant.slug} is ${tenant.status}` },
      },
      { status: 403 },
    );
  }
  return { tenantId: tenant.id, client: projectClient(tenant.dbName) };
}
