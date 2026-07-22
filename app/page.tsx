import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES } from "@/lib/constants";

const ROLE_HOME: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "/super-admin",
  [ROLES.ORG_ADMIN]: "/organization",
  [ROLES.GENERATOR_ADMIN]: "/generator",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role] ?? "/login");
  }
  redirect("/login");
}
