"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StatusUpdate({
  violationId,
  currentStatus,
  onStatusUpdated,
}: {
  violationId: number;
  currentStatus: string;
  onStatusUpdated: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);

  const handleUpdate = async () => {
    const res = await fetch(`/api/violation/${violationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      alert("Status updated!");
      onStatusUpdated(); // Refresh parent component
    } else {
      const errorData = await res.json();
      alert(`Error updating status: ${errorData.error}`);
    }
  };

  return (
    <div className="flex space-x-2 mt-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="UNPAID">Unpaid</SelectItem>
          <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
          <SelectItem value="PAID">Paid</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleUpdate}>Update Status</Button>
    </div>
  );
}