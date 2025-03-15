// components/EditViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bus, Truck } from "lucide-react";

type Violation = {
  id: string; // Changed to string for UUID
  vehicle?: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  payments?: { amount: number }[];
};

type EditViolationFormProps = {
  violation: Violation;
  onUpdate: () => void;
  onCancel: () => void;
};

export default function EditViolationForm({ violation, onUpdate, onCancel }: EditViolationFormProps) {
  const [formData, setFormData] = useState({
    plateNumber: violation.vehicle?.plateNumber || "",
    vehicleType: violation.vehicle?.vehicleType || "MULTICAB",
    violationType: violation.violationType,
    dateTime: new Date(violation.dateTime).toISOString().slice(0, 16),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Plate Number</Label>
        <Input
          value={formData.plateNumber}
          onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
          placeholder="ABC-1234"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label>Vehicle Type</Label>
        <RadioGroup
          value={formData.vehicleType}
          onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
          className="grid grid-cols-2 gap-4 mt-2"
        >
          <div>
            <RadioGroupItem value="MULTICAB" id="multicab" className="peer sr-only" />
            <Label
              htmlFor="multicab"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Bus className="mb-3 h-6 w-6" />
              Multicab
            </Label>
          </div>
          <div>
            <RadioGroupItem value="VAN" id="van" className="peer sr-only" />
            <Label
              htmlFor="van"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Truck className="mb-3 h-6 w-6" />
              Van
            </Label>
          </div>
        </RadioGroup>
      </div>
      <div>
        <Label>Violation Type</Label>
        <Input
          value={formData.violationType}
          disabled
          className="mt-1"
        />
      </div>
      <div>
        <Label>Date and Time</Label>
        <Input
          type="datetime-local"
          value={formData.dateTime}
          onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
          required
          className="mt-1"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update</Button>
      </div>
    </form>
  );
}