// components/CreateViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Bus, Car } from "lucide-react";

type CreateViolationFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

export default function CreateViolationForm({ onSuccess, onCancel }: CreateViolationFormProps) {
  const [formData, setFormData] = useState({
    plateNumber: "",
    vehicleType: "MULTICAB",
    violationType: "TERMINAL_FEE",
  });
  const [plateInput, setPlateInput] = useState("");

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (value.length > 3 && !value.includes("-")) {
      value = value.slice(0, 3) + "-" + value.slice(3);
    }
    if (value.length > 8) value = value.slice(0, 8); // Limit to LLL-DDDD format
    setPlateInput(value);
    setFormData((prev) => ({ ...prev, plateNumber: value }));
  };

  const handleVehicleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, vehicleType: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form data:", formData); // Debug log
    const platePattern = /^[A-Z]{3}-[0-9]{4}$/;
    if (!platePattern.test(formData.plateNumber)) {
      toast.error("Plate number must be in the format LLL-DDDD (e.g., ABC-1234)");
      return;
    }

    try {
      const response = await fetch("/api/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.log("API error response:", errorData); // Debug log
        throw new Error(errorData.error || "Failed to create vehicle violation");
      }
      const result = await response.json();
      console.log("API success response:", result); // Debug log
      toast.success("Vehicle violation created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating vehicle violation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create vehicle violation");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="plateNumber">Plate Number</Label>
        <Input
          id="plateNumber"
          value={plateInput}
          onChange={handlePlateChange}
          placeholder="ABC-1234"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="violationType">Violation Type</Label>
        <Input
          id="violationType"
          value={formData.violationType}
          disabled
          className="mt-1"
        />
      </div>
      <div>
        <Label>Vehicle Type</Label>
        <RadioGroup
          value={formData.vehicleType}
          onValueChange={handleVehicleTypeChange}
          className="grid grid-cols-2 gap-4 mt-2"
        >
          <div>
            <RadioGroupItem value="MULTICAB" id="multicab" className="peer sr-only" />
            <Label
              htmlFor="multicab"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Bus className="mb-3 h-6 w-6" />
              Multicab ₱20
            </Label>
          </div>
          <div>
            <RadioGroupItem value="VAN" id="van" className="peer sr-only" />
            <Label
              htmlFor="van"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Car className="mb-3 h-6 w-6" />
              Van ₱30
            </Label>
          </div>
        </RadioGroup>
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