import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listUserProjects } from "@/lib/db/projectClient";
import { ReportsTabs } from "@/components/insights/ReportsTabs";
import { ProjectSwitcher } from "@/components/insights/ProjectSwitcher";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const projects = await listUserProjects(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">数据报表</h1>
        <ProjectSwitcher
          projects={projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name }))}
          defaultSlug={projects[0]?.slug ?? null}
        />
      </div>
      <ReportsTabs />
      {children}
    </div>
  );
}
