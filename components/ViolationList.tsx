// components/ViolationList.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreateViolationForm from "@/components/CreateViolationForm";
import EditViolationForm from "@/components/EditViolationForm";
import ViewViolationForm from "@/components/ViewViolationForm";
import { toast } from "sonner";

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

export default function ViolationList({ isAdmin = false }: { isAdmin?: boolean }) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [groupedViolations, setGroupedViolations] = useState<GroupedViolation[]>([]);
  const [editViolation, setEditViolation] = useState<Violation | null>(null);
  const [deleteViolation, setDeleteViolation] = useState<Violation | null>(null);
  const [viewViolations, setViewViolations] = useState<GroupedViolation | null>(null);
  const [searchPlateNumber, setSearchPlateNumber] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchViolations = async () => {
    const res = await fetch("/api/violation");
    if (res.ok) {
      const data = await res.json();
      setViolations(data);
    } else {
      console.error("Failed to fetch violations");
      toast.error("Failed to fetch violations");
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  useEffect(() => {
    const grouped = violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
      const plateNumber = v.vehicle?.plateNumber || "N/A";
      if (!acc[plateNumber]) {
        acc[plateNumber] = {
          plateNumber,
          vehicleType: v.vehicle?.vehicleType || "N/A",
          violations: [],
        };
      }
      acc[plateNumber].violations.push(v);
      return acc;
    }, {});

    let filtered = Object.values(grouped);
    if (searchPlateNumber) {
      filtered = filtered.filter((group) =>
        group.plateNumber.toLowerCase().includes(searchPlateNumber.toLowerCase())
      );
    }

    setGroupedViolations(filtered);
  }, [violations, searchPlateNumber]);

  const handleDelete = async () => {
    if (!deleteViolation) return;

    const res = await fetch(`/api/violation/${deleteViolation.id}`, { method: "DELETE" });
    if (res.ok) {
      setViolations(violations.filter((v) => v.id !== deleteViolation.id));
      setDeleteViolation(null);
      setViewViolations(null);
      toast.success("Violation deleted successfully!");
    } else {
      const errorData = await res.json();
      toast.error("Failed to delete violation: " + errorData.error);
    }
  };

  const handleEdit = (violation: Violation) => {
    setEditViolation(violation);
  };

  const handleUpdate = async (updatedAttachments: string[]) => {
    if (!editViolation) return;

    const res = await fetch(`/api/violation/${editViolation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachment: updatedAttachments.join(",") }),
    });

    if (res.ok) {
      const updatedViolation = await res.json();
      setViolations(
        violations.map((v) => (v.id === updatedViolation.id ? updatedViolation : v))
      );
      setEditViolation(null);
      fetchViolations();
      toast.success("Violation updated successfully!");
    } else {
      const errorData = await res.json();
      toast.error("Failed to update violation: " + errorData.error);
    }
  };

  const handlePay = async (violation: Violation, amount: number) => {
    const res = await fetch(`/api/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        violationId: violation.id,
        amount,
      }),
    });

    if (res.ok) {
      const updatedViolation = await res.json();
      setViolations(
        violations.map((v) => (v.id === updatedViolation.id ? updatedViolation : v))
      );
      fetchViolations();
    } else {
      const errorData = await res.json();
      console.error("Failed to record payment:", errorData);
      toast.error("Failed to record payment: " + errorData.error);
    }
  };

  const handlePayAll = async (violationIds: number[], totalAmount: number) => {
    const res = await fetch(`/api/payment/pay-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        violationIds,
        totalAmount,
      }),
    });

    if (res.ok) {
      fetchViolations();
      setViewViolations(null);
    } else {
      const errorData = await res.json();
      console.error("Failed to record pay-all:", errorData);
      toast.error("Failed to record pay-all: " + errorData.error);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchViolations();
  };

  const calculateTotals = (group: GroupedViolation) => {
    const fee = group.violations[0]?.fineAmount || 0;
    const totalFines = group.violations.reduce((sum, v) => sum + v.fineAmount, 0);
    const totalPaid = group.violations.reduce(
      (sum, v) => sum + (v.payments?.reduce((pSum: number, p: any) => pSum + p.amount, 0) || 0),
      0
    );
    const remainingBalance = totalFines - totalPaid;
    const status = group.violations.every((v) => v.status === "PAID")
      ? "PAID"
      : group.violations.some((v) => v.status === "PARTIALLY_PAID")
      ? "PARTIALLY_PAID"
      : "UNPAID";

    return { fee, totalFines, remainingBalance, status };
  };

  const formatStatus = (status: string) => {
    return status
      .toLowerCase()
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <Input
          placeholder="Search by Plate Number"
          value={searchPlateNumber}
          onChange={(e) => setSearchPlateNumber(e.target.value)}
          className="max-w-xs"
        />
        {isAdmin && (
          <Button onClick={() => setShowCreateForm(true)}>Create Violation</Button>
        )}
      </div>

      {/* Create Violation Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Violation</DialogTitle>
          </DialogHeader>
          <CreateViolationForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Violations Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Plate Number</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-center">Violation Count</TableHead>
              <TableHead className="text-right">Total Fee</TableHead>
              <TableHead className="text-right">Remaining Balance</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedViolations.map((group, index) => {
              const { fee, totalFines, remainingBalance, status } = calculateTotals(group);
              return (
                <TableRow key={group.plateNumber}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{group.plateNumber}</TableCell>
                  <TableCell>{group.vehicleType}</TableCell>
                  <TableCell className="text-right">₱{fee.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{group.violations.length}</TableCell>
                  <TableCell className="text-right">₱{totalFines.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₱{remainingBalance.toFixed(2)}</TableCell>
                  <TableCell>{formatStatus(status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(group.violations[0])}
                      >
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => setViewViolations(group)}>
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteViolation(group.violations[0])}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* View Violations Sheet */}
      {viewViolations && (
        <Sheet open={!!viewViolations} onOpenChange={() => setViewViolations(null)}>
          <SheetContent side="right" className="w-[80vw] sm:max-w-[80vw]">
            <SheetHeader>
              <SheetTitle>Violations for Plate {viewViolations.plateNumber}</SheetTitle>
            </SheetHeader>
            <ViewViolationForm
              group={viewViolations}
              onPay={handlePay}
              onPayAll={handlePayAll}
              onClose={() => setViewViolations(null)}
              onUpdate={fetchViolations}
              setGroup={(updatedGroup) => setViewViolations(updatedGroup)} // Update viewViolations state
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Edit Violation Dialog */}
      {editViolation && (
        <Dialog open={!!editViolation} onOpenChange={() => setEditViolation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Violation</DialogTitle>
            </DialogHeader>
            <EditViolationForm
              violation={editViolation}
              onUpdate={handleUpdate}
              onCancel={() => setEditViolation(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteViolation && (
        <Dialog open={!!deleteViolation} onOpenChange={() => setDeleteViolation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the violation for plate{" "}
                {deleteViolation.vehicle?.plateNumber || "N/A"}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteViolation(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}