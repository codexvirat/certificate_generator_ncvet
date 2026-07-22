import type { Role } from "@/lib/constants";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      organizationId: string | null;
      status: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    organizationId: string | null;
    status: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string | null;
    status: string;
  }
}

// next-auth/jwt re-exports JWT from @auth/core/jwt; augment where it's actually
// declared too, since declaration merging only applies at the declaring module.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string | null;
    status: string;
  }
}
