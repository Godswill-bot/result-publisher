import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin-dashboard";
import { requireAdmin } from "@/lib/admin-session";
import { getDashboardSnapshot } from "@/lib/workflow";

export const metadata: Metadata = {
  title: "Admin Dashboard | SRDS",
  description: "Manage students, uploads, delivery logs, and publishing.",
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const { students, results, logs, stats } = await getDashboardSnapshot();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminDashboard
        adminEmail={admin.email}
        students={students}
        results={results}
        logs={logs}
        stats={stats}
      />
    </main>
  );
}
