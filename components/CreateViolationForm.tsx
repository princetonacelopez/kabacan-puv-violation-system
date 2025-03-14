// components/CreateViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type ViolationFormData = {
  plateNumber: string;
  vehicleType: string;
  violationType: string;
  dateTime: string;
  fineAmount: string;
  status: string;
};

export default function CreateViolationForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<ViolationFormData>({
    plateNumber: "",
    vehicleType: "MULTICAB",
    violationType: "TERMINAL_FEE",
    dateTime: new Date().toISOString().slice(0, 16),
    fineAmount: "",
    status: "UNPAID",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session || !["ADMIN", "TRAFFIC_ENFORCER"].includes(session.user.role)) {
      toast.error("Unauthorized: Please log in as an admin or traffic enforcer.");
      return;
    }

    const violationData = {
      ...formData,
      fineAmount: parseFloat(formData.fineAmount),
      dateTime: new Date(formData.dateTime).toISOString(),
    };

    try {
      const response = await fetch("/api/violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(violationData),
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch (parseError) {
          console.error("Failed to parse error response:", text);
          throw new Error(`Server error: ${text || "No response body"} (Status: ${response.status})`);
        }
        console.error("Error creating violation:", errorData);
        throw new Error(errorData.error || `Failed to create violation (Status: ${response.status})`);
      }

      await response.json();
      if (onSuccess) onSuccess();
      toast.success("Violation created successfully!");
    } catch (error) {
      console.error("Error creating violation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create violation");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Plate Number</label>
        <Input
          type="text"
          value={formData.plateNumber}
          onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
          required
        />
      </div>
      <div>
        <label>Vehicle Type</label>
        <select
          value={formData.vehicleType}
          onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
        >
          <option value="MULTICAB">Multicab</option>
          <option value="VAN">Van</option>
        </select>
      </div>
      <div>
        <label>Violation Type</label>
        <select
          value={formData.violationType}
          onChange={(e) => setFormData({ ...formData, violationType: e.target.value })}
        >
          <option value="TERMINAL_FEE">Terminal Fee</option>
        </select>
      </div>
      <div>
        <label>Date and Time</label>
        <Input
          type="datetime-local"
          value={formData.dateTime}
          onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
          required
        />
      </div>
      <div>
        <label>Fine Amount</label>
        <Input
          type="number"
          value={formData.fineAmount}
          onChange={(e) => setFormData({ ...formData, fineAmount: e.target.value })}
          step="0.01"
          min="0"
          required
        />
      </div>
      <div>
        <label>Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
        </select>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </div>
    </form>
  );
}