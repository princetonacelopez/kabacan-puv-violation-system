// app/vehicles/page.tsx
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
import { CreditCard, Plus, Upload } from "lucide-react";
import CreateViolationForm from "@/components/CreateViolationForm";
import { useViolations } from "@/app/contexts/ViolationsContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

type Violation = {
  id: string;
  vehicle: { plateNumber: string; vehicleType: string };
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
  vehicles: { plateNumber: string; vehicleType: string; violations: Violation[] }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function VehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { violations, setViolations, viewViolations, setViewViolations } = useViolations();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [payViolation, setPayViolation] = useState<Violation | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [showPayAllDialog, setShowPayAllDialog] = useState(false);
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isViewReady, setIsViewReady] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && !violations.length) {
      fetchAllViolations().finally(() => setIsDataLoading(false));
    } else {
      setIsDataLoading(false);
    }
  }, [status, router, violations.length]);

  useEffect(() => {
    if (!isDataLoading) {
      if (viewViolations !== undefined) {
        setIsViewReady(true);
      }
    }
  }, [isDataLoading, viewViolations]);

  const fetchAllViolations = async () => {
    try {
      console.log("Fetching vehicles with session:", session);
      const response = await fetch(`/api/vehicle?page=1&limit=1000`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch vehicles");
      }
      const data: PaginatedResponse = await response.json();
      console.log("Raw API response:", data);

      const groupedViolations: GroupedViolation[] = data.vehicles
        .filter((vehicle) => vehicle.violations && vehicle.violations.length > 0)
        .map((vehicle) => ({
          plateNumber: vehicle.plateNumber,
          vehicleType: vehicle.vehicleType,
          violations: vehicle.violations.map((violation) => ({
            ...violation,
            vehicle: {
              plateNumber: vehicle.plateNumber,
              vehicleType: vehicle.vehicleType,
            },
          })),
        }));
      console.log("Transformed groupedViolations:", groupedViolations);

      const flatViolations = groupedViolations.flatMap((group) => group.violations);
      setViolations(flatViolations);

      if (groupedViolations.length > 0 && !viewViolations) {
        console.log("Setting first vehicle group:", groupedViolations[0]);
        setViewViolations(groupedViolations[0]);
      } else if (groupedViolations.length === 0 && viewViolations) {
        setViewViolations(null);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch vehicles");
      setViolations([]);
      setViewViolations(null);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchAllViolations();
  };

  const handlePay = async () => {
    if (!payViolation) return;

    const paidAmount = payViolation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remaining = payViolation.fineAmount - paidAmount;
    const amount = parseInt(payAmount) || 0;

    if (amount <= 0 || amount > remaining) {
      toast.error("Please enter a valid amount between 1 and the remaining balance.");
      return;
    }

    try {
      const response = await fetch(`/api/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          violationId: payViolation.id,
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
        setPayViolation(null);
        setPayAmount("");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    }
  };

  const handlePayAll = async () => {
    if (selectedViolations.length === 0) {
      toast.warning("No violations selected for payment.");
      setShowPayAllDialog(false);
      return;
    }

    const totalAmount = selectedViolations.reduce((sum, id) => {
      const violation = viewViolations?.violations.find((v) => v.id === id);
      const paid = violation?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return sum + (violation?.fineAmount || 0) - paid;
    }, 0);

    try {
      const response = await fetch(`/api/payment/pay-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          violationIds: selectedViolations,
          totalAmount,
        }),
        credentials: "include",
      });
      if (response.ok) {
        setViewViolations(null);
        setSelectedViolations([]);
        toast.success("All payments recorded successfully!");
        fetchAllViolations();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to record pay-all");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record pay-all");
    }
    setShowPayAllDialog(false);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await fetch("/api/vehicle/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setImportErrors(errorData.errors);
        } else {
          throw new Error(errorData.error || "Failed to import vehicles");
        }
        return;
      }

      await response.json();
      setImportErrors([]);
      setShowImportDialog(false);
      setImportFile(null);
      toast.success("Vehicles imported successfully!");
      fetchAllViolations();
    } catch (error) {
      console.error("Error importing vehicles:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import vehicles");
    }
  };

  const handleSelectViolation = (id: string) => {
    setSelectedViolations((prev) =>
      prev.includes(id) ? prev.filter((vid) => vid !== id) : [...prev, id]
    );
  };

  if (isDataLoading || !isViewReady) {
    return (
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background p-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <Skeleton className="h-4 w-16" />
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <Skeleton className="h-4 w-20" />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex space-x-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-8 w-[300px]" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SidebarInset>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const isAdmin = session?.user?.role === "ADMIN";

  console.log("viewViolations:", viewViolations);
  console.log("violations from context:", violations);

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
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/vehicles">Vehicles</BreadcrumbLink>
            </BreadcrumbItem>
            {viewViolations && (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Violations</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        {isAdmin && (
          <div className="ml-auto flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={selectedViolations.length === 0}
              onClick={() => setShowPayAllDialog(true)}
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {viewViolations ? (
          <>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Violations for Plate {viewViolations.plateNumber}
              {isAdmin && (
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={selectedViolations.length === 0}
                    onClick={() => setShowPayAllDialog(true)}
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedViolations.length === viewViolations.violations.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedViolations(viewViolations.violations.map((v) => v.id));
                        } else {
                          setSelectedViolations([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Fine Amount</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewViolations.violations.map((violation) => {
                  const paidAmount = violation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                  const remaining = violation.fineAmount - paidAmount;
                  return (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedViolations.includes(violation.id)}
                          onCheckedChange={() => handleSelectViolation(violation.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(violation.dateTime).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">{violation.violationType}</TableCell>
                      <TableCell className="text-sm">₱{violation.fineAmount.toFixed(0)}</TableCell>
                      <TableCell className="text-sm">₱{remaining.toFixed(0)}</TableCell>
                      <TableCell className="text-sm">{violation.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPayViolation(violation)}
                              disabled={remaining <= 0}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="p-4 text-muted-foreground">No vehicle selected</div>
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

        {/* Pay Violation Dialog */}
        {payViolation && (
          <Dialog open={!!payViolation} onOpenChange={() => setPayViolation(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pay Violation</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Enter the amount to pay for violation dated{" "}
                {new Date(payViolation.dateTime).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}. 
                Remaining balance: ₱{(payViolation.fineAmount - (payViolation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toFixed(0)}.
              </DialogDescription>
              <div className="my-4">
                <Input
                  type="number"
                  min="1"
                  max={payViolation.fineAmount - (payViolation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)}
                  placeholder="Enter amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayViolation(null)}>
                  Cancel
                </Button>
                <Button onClick={handlePay}>
                  Pay
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Pay All Dialog */}
        <Dialog open={showPayAllDialog} onOpenChange={setShowPayAllDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pay All Selected Violations</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Confirm payment for all selected violations. Total amount: ₱{
                selectedViolations.reduce((sum, id) => {
                  const violation = viewViolations?.violations.find((v) => v.id === id);
                  const paid = violation?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                  return sum + (violation?.fineAmount || 0) - paid;
                }, 0).toFixed(0)
              }.
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayAllDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayAll}>
                Pay All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Vehicles Dialog */}
        <Dialog open={showImportDialog} onOpenChange={(open) => {
          setShowImportDialog(open);
          if (!open) {
            setImportFile(null);
            setImportErrors([]);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Vehicles</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Download the sample CSV file below to import vehicles. Ensure the file matches the required headers.
            </DialogDescription>
            <div className="mt-2">
              <a
                href="/api/vehicle/sample-csv"
                download="sample-vehicle-import.csv"
                className="text-blue-500 hover:underline"
              >
                Download Sample CSV
              </a>
            </div>
            <div className="my-4">
              <Input
                type="file"
                accept=".csv"
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