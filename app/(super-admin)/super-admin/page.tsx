import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { ROLES } from "@/lib/constants";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";

export default async function SuperAdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  await connectDB();
  const [orgCount, orgAdminCount, generatorCount] = await Promise.all([
    Organization.countDocuments(),
    User.countDocuments({ role: ROLES.ORG_ADMIN }),
    User.countDocuments({ role: ROLES.GENERATOR_ADMIN }),
  ]);

  return (
    <DashboardShell title="Super Admin Dashboard" subtitle={session.user.name ?? session.user.email ?? ""}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Organizations" value={orgCount} />
        <StatCard label="Organization Admins" value={orgAdminCount} />
        <StatCard label="Generator Admins" value={generatorCount} />
      </div>
    </DashboardShell>
  );
}
