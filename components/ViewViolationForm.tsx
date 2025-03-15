// components/ViewViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Violation = {
  id: string; // Changed to string for UUID
  vehicle?: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  payments?: { amount: number; dateTime: string }[];
};

type GroupedViolation = {
  plateNumber: string;
  vehicleType: string;
  violations: Violation[];
};

type ViewViolationFormProps = {
  group: GroupedViolation;
  onPay: (violation: Violation, amount: number) => void;
  onPayAll: (violationIds: string[], totalAmount: number) => void;
  onClose: () => void;
  onUpdate: () => void;
  setGroup: (updatedGroup: GroupedViolation) => void;
};

export default function ViewViolationForm({
  group,
  onPay,
  onPayAll,
  onClose,
  onUpdate,
  setGroup,
}: ViewViolationFormProps) {
  const [payAmount, setPayAmount] = useState<{ [key: string]: string }>({});
  const [payAllAmount, setPayAllAmount] = useState("");

  const handlePay = (violation: Violation) => {
    const amount = parseInt(payAmount[violation.id] || "0");
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid whole number payment amount");
      return;
    }
    onPay(violation, amount);
    setPayAmount((prev) => ({ ...prev, [violation.id]: "" }));
  };

  const handlePayAll = () => {
    const amount = parseInt(payAllAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid whole number total payment amount");
      return;
    }
    onPayAll(group.violations.map((v) => v.id), amount);
    setPayAllAmount("");
  };

  const totalFines = group.violations.reduce((sum, v) => sum + v.fineAmount, 0);
  const totalPaid = group.violations.reduce(
    (sum, v) => sum + (v.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0),
    0
  );
  const remainingBalance = totalFines - totalPaid;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Violations for Plate {group.plateNumber}</h3>
      <div className="space-y-4">
        {group.violations.map((violation) => {
          const paidForViolation = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const remainingForViolation = violation.fineAmount - paidForViolation;

          return (
            <div key={violation.id} className="border p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Violation ID: {violation.id}</span>
                <span>Status: {violation.status.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {new Date(violation.dateTime).toLocaleString()}</span>
                <span>Fine: ₱{violation.fineAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid: ₱{paidForViolation.toFixed(0)}</span>
                <span>Remaining: ₱{remainingForViolation.toFixed(0)}</span>
              </div>
              {violation.payments && violation.payments.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Payment History:</h4>
                  <ul className="list-disc pl-5 text-sm">
                    {violation.payments.map((payment, index) => (
                      <li key={index}>
                        Paid ₱{payment.amount.toFixed(0)} on {new Date(payment.dateTime).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex space-x-2 mt-2">
                <Input
                  type="number"
                  value={payAmount[violation.id] || ""}
                  onChange={(e) =>
                    setPayAmount((prev) => ({ ...prev, [violation.id]: e.target.value }))
                  }
                  placeholder="Enter amount"
                  className="w-32"
                  step="1"
                  min="1"
                />
                <Button
                  onClick={() => handlePay(violation)}
                  disabled={!payAmount[violation.id] || parseInt(payAmount[violation.id]) <= 0}
                >
                  Pay
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium">Summary</h4>
        <div className="flex justify-between mt-2">
          <span>Total Fines: ₱{totalFines.toFixed(0)}</span>
          <span>Paid: ₱{totalPaid.toFixed(0)}</span>
          <span>Remaining: ₱{remainingBalance.toFixed(0)}</span>
        </div>
        <div className="flex space-x-2 mt-4">
          <Input
            type="number"
            value={payAllAmount}
            onChange={(e) => setPayAllAmount(e.target.value)}
            placeholder="Total Amount"
            className="w-32"
            step="1"
            min="1"
          />
          <Button onClick={handlePayAll} disabled={!payAllAmount || parseInt(payAllAmount) <= 0}>
            Pay All
          </Button>
        </div>
      </div>
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}