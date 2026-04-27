import { NextResponse } from "next/server";

export function verifyMakeSecret(req: Request): NextResponse | null {
  const secret = req.headers.get("x-make-secret");
  if (secret !== process.env.MAKE_SHARED_SECRET) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Bad secret" } },
      { status: 401 },
    );
  }
  return null;
}
