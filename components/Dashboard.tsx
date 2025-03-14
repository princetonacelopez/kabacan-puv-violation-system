// app/dashboard/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSession } from "next-auth/react";

// Sample data for the analytics chart
const analyticsData = [
  { name: "Jan", violations: 400 },
  { name: "Feb", violations: 300 },
  { name: "Mar", violations: 600 },
  { name: "Apr", violations: 800 },
  { name: "May", violations: 500 },
];

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    return <div>Access Denied: Only admins can view the dashboard.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Analytics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="violations" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Violations Card */}
        <Card>
          <CardHeader>
            <CardTitle>Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Total Violations: 25</p> {/* Replace with dynamic data from API */}
            <p>Pending: 10</p>
            <p>Paid: 15</p>
          </CardContent>
        </Card>

        {/* Activity Logs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>Admin created violation #12 - 2025-03-12</li>
              <li>Traffic Enforcer paid violation #10 - 2025-03-11</li>
              <li>Admin updated user role - 2025-03-10</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}