import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setCurrentProjectCookie, assertUserProject } from "@/lib/db/currentProject";

const Body = z.object({ slug: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const project = await assertUserProject(userId, parsed.data.slug);
  if (!project) {
    return NextResponse.json({ ok: false, error: "No access" }, { status: 403 });
  }
  await setCurrentProjectCookie(parsed.data.slug);
  return NextResponse.json({ ok: true });
}
