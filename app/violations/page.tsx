// app/violations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Pencil, Trash, Upload } from "lucide-react";
import CreateViolationForm from "@/components/CreateViolationForm";
import EditViolationForm from "@/components/EditViolationForm";
import { useViolations } from "@/app/contexts/ViolationsContext"; // Ensure correct path

type Violation = {
  id: string;
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
  const { violations, setViolations, viewViolations, setViewViolations } = useViolations();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editViolation, setEditViolation] = useState<Violation | null>(null);
  const [deactivateViolationId, setDeactivateViolationId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [payAmount, setPayAmount] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && !violations.length) {
      fetchAllViolations();
    }
  }, [status, router, violations.length]);

  const fetchAllViolations = async () => {
    try {
      console.log("Fetching violations with session:", session);
      const response = await fetch(`/api/violation?page=1&limit=500`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch all violations");
      }
      const data: PaginatedResponse = await response.json();
      console.log("All violations fetched:", data.violations.length, data.violations);
      setViolations(data.violations || []);
      if (data.violations.length > 0 && !viewViolations) {
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
        const firstGroup = Object.values(grouped)[0];
        console.log("Setting first violation group:", firstGroup);
        setViewViolations(firstGroup);
      }
    } catch (error) {
      console.error("Error fetching all violations:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch all violations");
      setViolations([]);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const response = await fetch(`/api/violation?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to deactivate violation");
      setViolations((prev) => prev.filter((v) => v.id !== id));
      setViewViolations((prev) =>
        prev ? { ...prev, violations: prev.violations.filter((v) => v.id !== id) } : null
      );
      toast.success("Violation deactivated successfully!");
      setDeactivateViolationId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate violation");
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchAllViolations();
  };

  const handleUpdate = async () => {
    if (!editViolation) return;

    try {
      const response = await fetch(`/api/violation?id=${editViolation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: editViolation.vehicle?.plateNumber,
          vehicleType: editViolation.vehicle?.vehicleType,
          violationType: editViolation.violationType,
          dateTime: new Date(editViolation.dateTime).toISOString(),
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update violation");
      const updatedViolation = await response.json();
      setViolations((prev) =>
        prev.map((v) => (v.id === updatedViolation.id ? updatedViolation : v))
      );
      setViewViolations((prev) =>
        prev
          ? {
              ...prev,
              violations: prev.violations.map((v) =>
                v.id === updatedViolation.id ? updatedViolation : v
              ),
            }
          : null
      );
      setEditViolation(null);
      toast.success("Violation updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update violation");
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await fetch("/api/violation/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setImportErrors(errorData.errors);
        } else {
          throw new Error(errorData.error || "Failed to import violations");
        }
        return;
      }

      await response.json();
      setImportErrors([]);
      setShowImportDialog(false);
      setImportFile(null);
      toast.success("Violations imported successfully!");
      fetchAllViolations();
    } catch (error) {
      console.error("Error importing violations:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import violations");
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  const isAdmin = session?.user?.role === "ADMIN";

  console.log("viewViolations:", viewViolations);
  console.log("violations from context:", violations); // Debug log to check context data

  if (!session) {
    return <div>Session not available</div>;
  }

  return (
    <SidebarInset>
      <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background p-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Traffic Violations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Violations</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {isAdmin && (
          <div className="ml-auto flex space-x-2">
            <Button onClick={() => setShowImportDialog(true)} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => setShowCreateForm(true)} size="sm">
              Create
            </Button>
            <Button
              disabled={!viewViolations}
              onClick={() => viewViolations && setEditViolation(viewViolations.violations[0])}
              size="sm"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {viewViolations ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Violations for Plate {viewViolations.plateNumber}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4">
                {viewViolations.violations.map((violation) => {
                  const paidAmount = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                  const remaining = violation.fineAmount - paidAmount;
                  return (
                    <div key={violation.id} className="flex flex-col gap-2 border rounded-lg p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Date: {new Date(violation.dateTime).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Status: {violation.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">
                          Fine Amount: ₱{violation.fineAmount.toFixed(0)}
                        </span>
                        <span className="text-sm">
                          Paid: ₱{paidAmount.toFixed(0)}
                        </span>
                        <span className="text-sm">
                          Remaining: ₱{remaining.toFixed(0)}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditViolation(violation)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeactivateViolationId(violation.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                      <div>
                        <label className="text-sm text-muted-foreground">Pay Amount:</label>
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            min="5"
                            max={remaining}
                            placeholder="Enter amount"
                            className="w-32"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                          />
                          <Button
                            onClick={async () => {
                              if (remaining > 0) {
                                const amount = parseInt(payAmount) || 0;
                                if (amount <= 0 || amount > remaining) {
                                  toast.error("Please enter a valid amount between 5 and the remaining balance.");
                                  return;
                                }
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
                                  setViolations((prev) =>
                                    prev.map((v) => (v.id === updatedViolation.id ? updatedViolation : v))
                                  );
                                  setViewViolations((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          violations: prev.violations.map((v) =>
                                            v.id === updatedViolation.id ? updatedViolation : v
                                          ),
                                        }
                                      : null
                                  );
                                  toast.success("Payment recorded successfully!");
                                  setPayAmount("");
                                } else {
                                  const errorData = await response.json();
                                  toast.error(errorData.error || "Failed to record payment");
                                }
                              }
                            }}
                            disabled={remaining <= 0}
                            size="sm"
                          >
                            Pay
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Button
                          onClick={async () => {
                            const totalAmount = viewViolations.violations.reduce(
                              (sum, v) => sum + (v.fineAmount - (v.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0)),
                              0
                            );
                            const response = await fetch(`/api/payment/pay-all`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                violationIds: viewViolations.violations.map((v) => v.id),
                                totalAmount,
                              }),
                              credentials: "include",
                            });
                            if (response.ok) {
                              setViewViolations(null);
                              toast.success("All payments recorded successfully!");
                              fetchAllViolations();
                            } else {
                              const errorData = await response.json();
                              toast.error(errorData.error || "Failed to record pay-all");
                            }
                          }}
                          disabled={viewViolations.violations.every((v) => v.status === "PAID")}
                          size="sm"
                        >
                          Pay All
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="p-4 text-muted-foreground">No violation selected</div>
        )}

        {/* Create Violation Dialog */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="sm:max-w-[600px]">
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
            <DialogContent className="sm:max-w-[600px]">
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

        {/* Deactivate Confirmation Dialog */}
        <Dialog open={deactivateViolationId !== null} onOpenChange={() => setDeactivateViolationId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deactivation</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Are you sure you want to deactivate this violation? This action cannot be undone.
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateViolationId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deactivateViolationId && handleDeactivate(deactivateViolationId)}
              >
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Violations Dialog */}
        <Dialog open={showImportDialog} onOpenChange={(open) => {
          setShowImportDialog(open);
          if (!open) {
            setImportFile(null);
            setImportErrors([]);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Violations</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Upload a JSON or CSV file containing violations. The file must match the required format:
              <ul className="list-disc pl-5 mt-2">
                <li>plateNumber (string, format: LLL-DDDD, e.g., "ABC-1234")</li>
                <li>vehicleType (enum: MULTICAB, VAN)</li>
                <li>violationType (enum: TERMINAL_FEE)</li>
                <li>dateTime (ISO string, e.g., "2025-03-14T12:00:00Z")</li>
              </ul>
            </DialogDescription>
            <div className="my-4">
              <Input
                type="file"
                accept=".json,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportErrors([]);
                }}
              />
            </div>
            {importErrors.length > 0 && (
              <div className="text-red-500 text-sm">
                <p>Errors found in the file:</p>
                <ul className="list-disc pl-5">
                  {importErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!importFile}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}