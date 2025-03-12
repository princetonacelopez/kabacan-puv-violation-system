"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaymentForm from "./PaymentForm";
import StatusUpdate from "./StatusUpdate";

type Payment = {
  id: number;
  amount: number;
  dateTime: string;
  updater: { username: string };
};

type Violation = {
  id: number;
  violationType: string;
  dateTime: string;
  location: string;
  fineAmount: number;
  status: string;
  attachment?: string;
  paidAmount: number;
  remainingBalance: number;
  payments: Payment[];
};

type SearchResult = {
  vehicle: { plateNumber: string; vehicleType: string };
  violations: Violation[];
  fineSummary: { totalFines: number; totalPaid: number; remainingBalance: number };
};

export default function ViolationSearch() {
  const [plateNumber, setPlateNumber] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setError("");
    setResult(null);
    const res = await fetch(`/api/violation?plateNumber=${encodeURIComponent(plateNumber)}`);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
    } else {
      const errorData = await res.json();
      setError(errorData.error || "Search failed");
    }
  };

  const handlePaymentAdded = () => {
    handleSearch();
  };

  const handlePayAll = async () => {
    if (!confirm("Pay all remaining balances for this vehicle?")) return;
    const res = await fetch("/api/payment/pay-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plateNumber }),
    });
    if (res.ok) {
      alert("All violations paid!");
      handleSearch();
    } else {
      const errorData = await res.json();
      alert(`Error paying all: ${errorData.error}`);
    }
  };

  const handleStatusUpdated = () => {
    handleSearch();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl mb-4">Search Violations</h2>
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Enter Plate Number"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl">Vehicle Details</h3>
            <p>Plate Number: {result.vehicle.plateNumber}</p>
            <p>Vehicle Type: {result.vehicle.vehicleType}</p>
          </div>
          <div>
            <h3 className="text-xl">Violations</h3>
            {result.violations.length === 0 ? (
              <p>No violations found.</p>
            ) : (
              <ul className="space-y-4">
                {result.violations.map((v) => (
                  <li key={v.id} className="border p-2">
                    <p>Violation: {v.violationType}</p>
                    <p>Date: {new Date(v.dateTime).toLocaleString()}</p>
                    <p>Location: {v.location}</p>
                    <p>Fine: ₱{v.fineAmount}</p>
                    <p>Paid: ₱{v.paidAmount}</p>
                    <p>Remaining: ₱{v.remainingBalance}</p>
                    <p>Status: {v.status}</p>
                    {v.attachment && (
                      <p>
                        Attachment: <a href={v.attachment} target="_blank">{v.attachment}</a>
                      </p>
                    )}
                    <StatusUpdate
                      violationId={v.id}
                      currentStatus={v.status}
                      onStatusUpdated={handleStatusUpdated}
                    />
                    {v.status !== "PAID" && (
                      <PaymentForm violationId={v.id} onPaymentAdded={handlePaymentAdded} />
                    )}
                    {v.payments.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-lg">Payment History</h4>
                        <ul className="space-y-1">
                          {v.payments.map((p) => (
                            <li key={p.id} className="text-sm">
                              ₱{p.amount} - {new Date(p.dateTime).toLocaleString()} by {p.updater.username}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-xl">Fine Summary</h3>
            <p>Total Fines: ₱{result.fineSummary.totalFines}</p>
            <p>Total Paid: ₱{result.fineSummary.totalPaid}</p>
            <p>Remaining Balance: ₱{result.fineSummary.remainingBalance}</p>
            {result.fineSummary.remainingBalance > 0 && (
              <Button onClick={handlePayAll} className="mt-2">
                Pay All (₱{result.fineSummary.remainingBalance})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}