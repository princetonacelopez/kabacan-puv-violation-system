"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardData = {
  totalViolations: number;
  statusBreakdown: { unpaid: number; partiallyPaid: number; paid: number };
  totalFinesCollected: number;
  recentViolations: {
    id: number;
    violationType: string;
    dateTime: string;
    status: string;
    vehicle: { plateNumber: string };
    creator: { username: string };
  }[];
  userActivity: {
    id: number;
    action: string;
    timestamp: string;
    user: { username: string };
  }[];
  vehicleTypeBreakdown: { multicab: number; van: number };
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => setError("Failed to load dashboard data"));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">{data.totalViolations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fines Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">₱{data.totalFinesCollected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Unpaid: {data.statusBreakdown.unpaid}</p>
            <p>Partially Paid: {data.statusBreakdown.partiallyPaid}</p>
            <p>Paid: {data.statusBreakdown.paid}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Violations (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentViolations.length === 0 ? (
            <p>No recent violations.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentViolations.map((v) => (
                <li key={v.id} className="border p-2">
                  <p>Plate: {v.vehicle.plateNumber}</p>
                  <p>Type: {v.violationType}</p>
                  <p>Date: {new Date(v.dateTime).toLocaleString()}</p>
                  <p>Status: {v.status}</p>
                  <p>Created by: {v.creator.username}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.userActivity.map((a) => (
              <li key={a.id} className="text-sm">
                {new Date(a.timestamp).toLocaleString()} - {a.action} by {a.user.username}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Violations by Vehicle Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Multicab: {data.vehicleTypeBreakdown.multicab}</p>
          <p>Van: {data.vehicleTypeBreakdown.van}</p>
        </CardContent>
      </Card>
    </div>
  );
}