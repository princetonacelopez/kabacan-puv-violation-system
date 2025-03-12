import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ViolationForm from "@/components/ViolationForm";
import ViolationList from "@/components/ViolationList";
import ViolationSearch from "@/components/ViolationSearch";
import Dashboard from "@/components/Dashboard";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl mb-6">Kabacan PUV Violation System</h1>
      {session.user.role === "ADMIN" ? (
        <Dashboard />
      ) : (
        <div className="space-y-8">
          <ViolationSearch />
          <ViolationForm />
          <ViolationList />
        </div>
      )}
    </main>
  );
}