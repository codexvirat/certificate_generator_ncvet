import type { NextAuthConfig } from "next-auth";
import { ROUTE_ROLE_MAP } from "@/lib/permissions";

// Edge-safe config: no Credentials provider here (bcrypt + mongoose need the
// Node runtime). middleware.ts only needs the `authorized` callback below,
// so it imports this file directly instead of the full auth.ts.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      session.user.status = token.status;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      const rule = ROUTE_ROLE_MAP.find((r) => pathname.startsWith(r.prefix));
      if (!rule) return true; // not a protected route group

      if (!user) return false; // redirects to signIn page
      if (user.status !== "active") return false;

      return rule.roles.includes(user.role);
    },
  },
};
