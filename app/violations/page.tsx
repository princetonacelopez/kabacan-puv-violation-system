// app/violations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import CreateViolationForm from "@/components/CreateViolationForm";
import EditViolationForm from "@/components/EditViolationForm";
import ViewViolationForm from "@/components/ViewViolationForm";

type Violation = {
  id: number;
  vehicle?: { plateNumber: string; vehicleType: string };
  violationType: string;
  dateTime: string;
  fineAmount: number;
  status: string;
  payments?: { amount: number }[];
};

type GroupedViolation = {
  plateNumber: string;
  vehicleType: string;
  violations: Violation[];
};

type PaginatedResponse = {
  violations: Violation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function ViolationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groupedViolations, setGroupedViolations] = useState<GroupedViolation[]>([]);
  const [searchPlateNumber, setSearchPlateNumber] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editViolation, setEditViolation] = useState<Violation | null>(null);
  const [viewViolations, setViewViolations] = useState<GroupedViolation | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    const fetchViolations = async () => {
      try {
        const response = await fetch(`/api/violation?page=${page}&limit=${limit}`, {
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch violations");
        }
        const data: PaginatedResponse = await response.json();

        const grouped = data.violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
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
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      } catch (error) {
        console.error("Error fetching violations:", error);
        toast.error(error instanceof Error ? error.message : "Failed to fetch violations");
      }
    };

    if (status === "authenticated") {
      fetchViolations();
    }
  }, [status, page, searchPlateNumber, router]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
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

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/violation/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete violation");
      setGroupedViolations((prev) =>
        prev.filter((group) => !group.violations.some((v) => v.id === id))
      );
      toast.success("Violation deleted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete violation");
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    // Refetch violations
    const fetchViolations = async () => {
      const response = await fetch(`/api/violation?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        const grouped = data.violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
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
        setGroupedViolations(Object.values(grouped));
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    };
    fetchViolations();
  };

  const handleUpdate = async (updatedAttachments: string[]) => {
    if (!editViolation) return;

    try {
      const response = await fetch(`/api/violation/${editViolation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update violation");
      const updatedViolation = await response.json();
      setGroupedViolations((prev) =>
        prev.map((group) => ({
          ...group,
          violations: group.violations.map((v) =>
            v.id === updatedViolation.id ? updatedViolation : v
          ),
        }))
      );
      setEditViolation(null);
      toast.success("Violation updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update violation");
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null; // Redirect handled in useEffect
  }

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Violations</h1>
      <Card>
        <CardHeader>
          <CardTitle>List of Violations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Input
              placeholder="Search by Plate Number"
              value={searchPlateNumber}
              onChange={(e) => setSearchPlateNumber(e.target.value)}
              className="max-w-xs"
            />
            {isAdmin && (
              <Button onClick={() => setShowCreateForm(true)}>
                Create Violation
              </Button>
            )}
          </div>

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
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>
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
                            onClick={() => setEditViolation(group.violations[0])}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setViewViolations(group)}
                          >
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(group.violations[0].id)}
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

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} entries
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Violation Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Violation</DialogTitle>
          </DialogHeader>
          <CreateViolationForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

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

      {/* View Violations Sheet */}
      {viewViolations && (
        <Sheet open={!!viewViolations} onOpenChange={() => setViewViolations(null)}>
          <SheetContent side="right" className="w-[80vw] sm:max-w-[80vw]">
            <SheetHeader>
              <SheetTitle>Violations for Plate {viewViolations.plateNumber}</SheetTitle>
            </SheetHeader>
            <ViewViolationForm
              group={viewViolations}
              onPay={async (violation, amount) => {
                const response = await fetch(`/api/payment`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    violationId: violation.id,
                    amount,
                  }),
                  credentials: "include",
                });
                if (response.ok) {
                  const updatedViolation = await response.json();
                  setGroupedViolations((prev) =>
                    prev.map((group) => ({
                      ...group,
                      violations: group.violations.map((v) =>
                        v.id === updatedViolation.id ? updatedViolation : v
                      ),
                    }))
                  );
                  toast.success("Payment recorded successfully!");
                } else {
                  const errorData = await response.json();
                  toast.error(errorData.error || "Failed to record payment");
                }
              }}
              onPayAll={async (violationIds, totalAmount) => {
                const response = await fetch(`/api/payment/pay-all`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    violationIds,
                    totalAmount,
                  }),
                  credentials: "include",
                });
                if (response.ok) {
                  setViewViolations(null);
                  toast.success("All payments recorded successfully!");
                  // Refetch violations
                  const fetchViolations = async () => {
                    const response = await fetch(`/api/violation?page=${page}&limit=${limit}`, {
                      credentials: "include",
                    });
                    if (response.ok) {
                      const data: PaginatedResponse = await response.json();
                      const grouped = data.violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
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
                      setGroupedViolations(Object.values(grouped));
                      setTotalPages(data.totalPages);
                      setTotalItems(data.total);
                    }
                  };
                  fetchViolations();
                } else {
                  const errorData = await response.json();
                  toast.error(errorData.error || "Failed to record pay-all");
                }
              }}
              onClose={() => setViewViolations(null)}
              onUpdate={async () => {
                const response = await fetch(`/api/violation?page=${page}&limit=${limit}`, {
                  credentials: "include",
                });
                if (response.ok) {
                  const data: PaginatedResponse = await response.json();
                  const grouped = data.violations.reduce((acc: { [key: string]: GroupedViolation }, v: Violation) => {
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
                  setGroupedViolations(Object.values(grouped));
                  setTotalPages(data.totalPages);
                  setTotalItems(data.total);
                }
              }}
              setGroup={(updatedGroup) => setViewViolations(updatedGroup)}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}