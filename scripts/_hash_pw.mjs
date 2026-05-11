import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const pw = process.env.NEW_PASSWORD;
if (!pw) { console.error("NEW_PASSWORD required"); process.exit(1); }

const hash = await bcrypt.hash(pw, 10);
// Simple cuid-ish: c + 24 hex chars (good enough as unique id).
const cuid = () => "c" + crypto.randomBytes(12).toString("hex");

console.log(JSON.stringify({
  hash,
  userId: cuid(),
  tenantUserId: cuid(),
}));
