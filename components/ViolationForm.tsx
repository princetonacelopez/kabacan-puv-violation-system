// components/ViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ViolationForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    plateNumber: "",
    vehicleType: "MULTICAB",
    violationType: "TERMINAL_FEE",
    dateTime: new Date().toISOString().slice(0, 16),
    location: "",
    attachment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { plateNumber, vehicleType, violationType, dateTime, location } = formData;

    if (!plateNumber || !vehicleType || !violationType || !dateTime || !location) {
      alert("Please fill all required fields.");
      return;
    }

    const res = await fetch("/api/violation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      alert("Violation created!");
      setFormData({
        plateNumber: "",
        vehicleType: "MULTICAB",
        violationType: "TERMINAL_FEE",
        dateTime: new Date().toISOString().slice(0, 16),
        location: "",
        attachment: "",
      });
      if (onSuccess) onSuccess(); // Call onSuccess callback if provided
    } else {
      alert("Error creating violation.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-md mx-auto">
      <Input
        placeholder="Plate Number *"
        value={formData.plateNumber}
        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
        required
      />
      <Select
        value={formData.vehicleType}
        onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Vehicle Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MULTICAB">Multicab</SelectItem>
          <SelectItem value="VAN">Van</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="datetime-local"
        value={formData.dateTime}
        onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
        required
      />
      <Input
        placeholder="Location (e.g., 7.123, 124.456) *"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        required
      />
      <Input
        placeholder="Attachment URL (optional)"
        value={formData.attachment}
        onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
      />
      <Button type="submit">Create Violation</Button>
    </form>
  );
}