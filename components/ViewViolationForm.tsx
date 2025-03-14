// components/ViewViolationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox"; // Import Shadcn Checkbox

type Violation = {
  id: number;
  vehicle?: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  location: string;
  fineAmount: number;
  status: string;
  attachment?: string;
  payments?: { amount: number }[];
};

type GroupedViolation = {
  plateNumber: string;
  vehicleType: string;
  violations: Violation[];
};

export default function ViewViolationForm({
  group,
  onPay,
  onPayAll,
  onClose,
  onUpdate,
  setGroup, // Add setGroup to update the violations dynamically
}: {
  group: GroupedViolation;
  onPay: (violation: Violation, amount: number) => void;
  onPayAll: (violationIds: number[], totalAmount: number) => void;
  onClose: () => void;
  onUpdate: () => void;
  setGroup: (updatedGroup: GroupedViolation) => void; // New prop to update group
}) {
  const [payViolation, setPayViolation] = useState<Violation | null>(null);
  const [payAllConfirm, setPayAllConfirm] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [selectedViolations, setSelectedViolations] = useState<number[]>([]);

  const formatStatus = (status: string) => {
    return status
      .toLowerCase()
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedViolations((prev) =>
      checked ? [...prev, id] : prev.filter((vid) => vid !== id)
    );
  };

  const totalFines = group.violations.reduce((sum, v) => sum + v.fineAmount, 0);
  const totalPaid = group.violations.reduce(
    (sum, v) => sum + (v.payments?.reduce((pSum: number, p: any) => pSum + p.amount, 0) || 0),
    0
  );
  const totalRemaining = totalFines - totalPaid;

  const selectedRemaining = group.violations
    .filter((v) => selectedViolations.includes(v.id))
    .reduce((sum, v) => {
      const paid = v.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0;
      const remaining = v.fineAmount - paid;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

  const selectedCount = selectedViolations.length;

  const getRemainingBalance = (violation: Violation) => {
    const paid = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return violation.fineAmount - paid;
  };

  const handlePay = (violation: Violation) => {
    const paid = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remaining = violation.fineAmount - paid;
    if (remaining <= 0) {
      toast.error("This violation is already fully paid.");
      return;
    }
    setPayViolation(violation);
    setPayAmount("");
  };

  const handlePaySubmit = () => {
    if (!payViolation) return;

    const paid = payViolation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remaining = payViolation.fineAmount - paid;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0 || amount > remaining) {
      toast.error(`Please enter a valid amount (max ₱${remaining.toFixed(2)}).`);
      return;
    }

    onPay(payViolation, amount);
    setPayViolation(null);
    setPayAmount("");
    onUpdate(); // Refresh data
    // Update the local group state with the latest violation data
    const updatedViolations = group.violations.map((v) =>
      v.id === payViolation.id ? { ...v, payments: [...(v.payments || []), { amount }], status: amount === remaining ? "PAID" : "PARTIALLY_PAID" } : v
    );
    setGroup({ ...group, violations: updatedViolations });
    toast.success("Payment recorded successfully!");
  };

  const handlePayAll = () => {
    if (selectedViolations.length === 0) {
      toast.error("Please select at least one violation to pay.");
      return;
    }
    if (selectedRemaining <= 0) {
      toast.error("No remaining balance to pay for selected violations.");
      return;
    }
    setPayAllConfirm(true);
    setPayAmount(selectedRemaining.toFixed(2));
  };

  const handlePayAllConfirm = () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedRemaining) {
      toast.error(`Please enter a valid amount (max ₱${selectedRemaining.toFixed(2)}).`);
      return;
    }

    onPayAll(selectedViolations, amount);
    setPayAllConfirm(false);
    setPayAmount("");
    setSelectedViolations([]);
    onUpdate(); // Refresh data
    // Update the local group state with the latest violation data
    const updatedViolations = group.violations.map((v) =>
      selectedViolations.includes(v.id)
        ? { ...v, payments: [...(v.payments || []), { amount: getRemainingBalance(v) }], status: "PAID" }
        : v
    );
    setGroup({ ...group, violations: updatedViolations });
    toast.success("All payments recorded successfully!");
  };

  const isFullyPaid = (violation: Violation) => {
    const paid = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return paid >= violation.fineAmount;
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={selectedViolations.length === group.violations.filter((v) => !isFullyPaid(v)).length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedViolations(group.violations.map((v) => v.id).filter((id) => !isFullyPaid(group.violations.find((v) => v.id === id)!)));
                    } else {
                      setSelectedViolations([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Violation Type</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead className="text-right">Fine</TableHead>
              <TableHead className="text-right">Remaining Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.violations.map((v) => {
              const paid = v.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
              const remaining = v.fineAmount - paid;
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedViolations.includes(v.id)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange(v.id, checked as boolean)}
                      disabled={isFullyPaid(v)}
                    />
                  </TableCell>
                  <TableCell>{v.violationType}</TableCell>
                  <TableCell>{new Date(v.dateTime).toLocaleString()}</TableCell>
                  <TableCell className="text-right">₱{v.fineAmount}</TableCell>
                  <TableCell className="text-right">₱{remaining.toFixed(2)}</TableCell>
                  <TableCell>{formatStatus(v.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => handlePay(v)}
                      disabled={isFullyPaid(v)}
                    >
                      Pay
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-right font-bold">
                Total Fees:
              </TableCell>
              <TableCell className="text-right font-bold">₱{totalFines.toFixed(2)}</TableCell>
              <TableCell className="text-right font-bold">Total Remaining: ₱{totalRemaining.toFixed(2)}</TableCell>
              <TableCell colSpan={2} className="text-right">
                <Button
                  onClick={handlePayAll}
                  disabled={selectedViolations.length === 0 || selectedRemaining <= 0}
                >
                  Pay {selectedCount > 0 ? `Selected (₱${selectedRemaining.toFixed(2)})` : "All"}
                </Button>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pay Dialog for Individual Violation */}
      {payViolation && (
        <Dialog open={!!payViolation} onOpenChange={() => setPayViolation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment for Violation</DialogTitle>
              <DialogDescription>
                Enter the payment amount for violation ID {payViolation.id}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayViolation(null)}>
                Cancel
              </Button>
              <Button onClick={handlePaySubmit}>Pay</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Pay All Confirmation Dialog */}
      {payAllConfirm && (
        <Dialog open={payAllConfirm} onOpenChange={() => setPayAllConfirm(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Payment for Selected Violations</DialogTitle>
              <DialogDescription>
                You are about to pay ₱{payAmount} for {selectedCount} selected violation{selectedCount !== 1 ? "s" : ""}. Confirm to proceed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayAllConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayAllConfirm}>Confirm Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}