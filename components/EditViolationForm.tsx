// components/EditViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Violation = {
  id: number;
  vehicle?: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  attachment?: string;
};

export default function EditViolationForm({
  violation,
  onUpdate,
  onCancel,
}: {
  violation: Violation;
  onUpdate: (attachments: string[]) => void;
  onCancel: () => void;
}) {
  const [attachments, setAttachments] = useState<string[]>(
    violation.attachment ? violation.attachment.split(",") : [""]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(attachments);
  };

  const addAttachment = () => {
    setAttachments([...attachments, ""]);
  };

  const updateAttachment = (index: number, value: string) => {
    const newAttachments = [...attachments];
    newAttachments[index] = value;
    setAttachments(newAttachments);
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments.length ? newAttachments : [""]);
  };

  const formatViolationType = (type: string) => {
    return type
      .toLowerCase()
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fee = violation.vehicle?.vehicleType === "MULTICAB" ? "₱20" : "₱30";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <Label htmlFor="plateNumber" className="block mb-2">
            Plate Number
          </Label>
          <Input
            id="plateNumber"
            value={(violation.vehicle?.plateNumber || "N/A").toUpperCase()} // Uppercase plate number
            disabled
            className="w-full"
          />
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex-1">
            <Label htmlFor="vehicleType" className="block mb-2">
              Vehicle Type
            </Label>
            <Input
              id="vehicleType"
              value={`${violation.vehicle?.vehicleType || "N/A"} (${fee})`}
              disabled
              className="w-full"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="dateTime" className="block mb-2">
            Date/Time
          </Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={new Date(violation.dateTime).toISOString().slice(0, 16)}
            disabled
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="violationType" className="block mb-2">
            Violation Type
          </Label>
          <Input
            id="violationType"
            value={formatViolationType(violation.violationType)}
            disabled
            className="w-full"
          />
        </div>
        <div>
          <Label className="block mb-2">Attachments</Label>
          {attachments.map((attachment, index) => (
            <div key={index} className="flex space-x-2 mt-2">
              <Input
                placeholder={`Attachment URL ${index + 1}`}
                value={attachment}
                onChange={(e) => updateAttachment(index, e.target.value)}
                className="flex-1"
              />
              <Button variant="destructive" onClick={() => removeAttachment(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addAttachment} className="mt-2">
            Add Attachment
          </Button>
        </div>
      </div>
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="w-auto">
          Save
        </Button>
      </div>
    </form>
  );
}