"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Violation = {
  id: number;
  vehicle: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  location: string;
  fineAmount: number;
  status: string;
  attachment?: string;
};

export default function ViolationList() {
  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    fetch("/api/violation")
      .then((res) => res.json())
      .then((data) => setViolations(data));
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this violation?")) {
      const res = await fetch(`/api/violation/${id}`, { method: "DELETE" });
      if (res.ok) {
        setViolations(violations.filter((v) => v.id !== id));
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl mb-4">Violation Records</h2>
      <ul className="space-y-2">
        {violations.map((v) => (
          <li key={v.id} className="border p-2 flex justify-between">
            <div>
              <p>Plate: {v.vehicle.plateNumber}</p>
              <p>Type: {v.vehicle.vehicleType}</p>
              <p>Fine: ₱{v.fineAmount}</p>
              <p>Status: {v.status}</p>
            </div>
            <Button variant="destructive" onClick={() => handleDelete(v.id)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}