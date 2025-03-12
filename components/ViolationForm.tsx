"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ViolationForm() {
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
    console.log("Submitting form data:", formData); // Log payload
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
    } else {
      const errorData = await res.json();
      console.error("Error response:", errorData); // Log server error
      alert(`Error creating violation: ${errorData.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-md mx-auto">
      <Input
        placeholder="Plate Number"
        value={formData.plateNumber}
        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
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
      />
      <Input
        placeholder="Location (e.g., 7.123, 124.456)"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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