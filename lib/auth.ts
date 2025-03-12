import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSession() {
  return await getServerSession(authOptions);
}

export function useAuth(allowedRoles: string[]) {
  return async () => {
    const session = await getSession();
    if (!session || !allowedRoles.includes(session.user.role)) {
      return { isAuthorized: false, redirect: "/auth/signin" };
    }
    return { isAuthorized: true, user: session.user };
  };
}