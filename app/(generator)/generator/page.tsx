import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { Candidate } from "@/models/Candidate";
import { ROLES } from "@/lib/constants";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";

// Generator Admin dashboard: assigned batch + progress only. No candidate
// create/edit affordances exist anywhere in this route group by design.
export default async function GeneratorDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== ROLES.GENERATOR_ADMIN) {
    redirect("/login");
  }

  await connectDB();
  const batches = await ExcelAssignment.find({ generatorId: session.user.id }).sort({
    assignedDate: -1,
  });

  const batchStats = await Promise.all(
    batches.map(async (batch) => {
      const [generated, pendingPhotos, total] = await Promise.all([
        Candidate.countDocuments({ assignmentId: batch._id, generated: true }),
        Candidate.countDocuments({ assignmentId: batch._id, photoUrl: null }),
        Candidate.countDocuments({ assignmentId: batch._id }),
      ]);
      return { batch, generated, pendingPhotos, total };
    })
  );

  return (
    <DashboardShell title="Generator Dashboard" subtitle={session.user.name ?? session.user.email ?? ""}>
      {batchStats.length === 0 && (
        <p className="text-sm text-zinc-500">No batch has been assigned to you yet.</p>
      )}

      <div className="flex flex-col gap-6">
        {batchStats.map(({ batch, generated, pendingPhotos, total }) => (
          <section
            key={batch._id.toString()}
            className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{batch.batchCode}</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {batch.status.replace("_", " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total Candidates" value={total} />
              <StatCard label="Generated" value={generated} />
              <StatCard label="Remaining" value={total - generated} />
              <StatCard label="Pending Photos" value={pendingPhotos} />
            </div>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
