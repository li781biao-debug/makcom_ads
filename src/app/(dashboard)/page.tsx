import { redirect } from "next/navigation";

// Home → reports. /reports handles the empty-state for users without
// any approved project membership.
export default function HomePage() {
  redirect("/reports");
}
