import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { User } from "@/models/User";
import { CertificateTemplate } from "@/models/CertificateTemplate";
import { ROLES } from "@/lib/constants";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { ORG_ADMIN_NAV } from "@/components/dashboard/nav";

export default async function OrganizationDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== ROLES.ORG_ADMIN) {
    redirect("/login");
  }

  await connectDB();
  const organizationId = session.user.organizationId;
  const [batchCount, generatorCount, templateCount] = await Promise.all([
    ExcelAssignment.countDocuments({ organizationId }),
    User.countDocuments({ organizationId, role: ROLES.GENERATOR_ADMIN }),
    CertificateTemplate.countDocuments({ organizationId }),
  ]);

  return (
    <DashboardShell
      title="Organization Dashboard"
      subtitle={session.user.name ?? session.user.email ?? ""}
      nav={ORG_ADMIN_NAV}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Batches" value={batchCount} />
        <StatCard label="Generator Admins" value={generatorCount} />
        <StatCard label="Certificate Templates" value={templateCount} />
      </div>
    </DashboardShell>
  );
}
