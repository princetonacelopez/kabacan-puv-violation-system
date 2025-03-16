// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" }, // Changed from email to username
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorize called with credentials:", credentials);
        if (!credentials?.username || !credentials?.password) {
          console.log("Missing username or password");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username }, // Changed from email to username
        });
        console.log("User found in database:", user);

        if (!user) {
          console.log("No user found with username:", credentials.username);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        console.log("Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          console.log("Invalid password for user:", credentials.username);
          return null;
        }

        return {
          id: user.id,
          name: user.fullName || user.username, // Use fullName if available, otherwise username
          email: user.email, // Keep email for session, even if not used for login
          role: user.role,
          image: user.image || "/avatars/default.jpg",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
  events: {
    async signOut({ token, session }) {
      console.log("Sign-out event triggered:", { token, session });
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };