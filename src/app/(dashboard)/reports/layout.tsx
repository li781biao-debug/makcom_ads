import { ReportsTabs } from "@/components/insights/ReportsTabs";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">数据报表</h1>
      <ReportsTabs />
      {children}
    </div>
  );
}
