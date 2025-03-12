"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaymentForm({ violationId, onPaymentAdded }: { violationId: number; onPaymentAdded: () => void }) {
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ violationId, amount: parseFloat(amount) }),
    });

    if (res.ok) {
      alert("Payment recorded!");
      setAmount("");
      onPaymentAdded(); // Trigger refresh of parent component
    } else {
      const errorData = await res.json();
      alert(`Error recording payment: ${errorData.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 mt-2">
      <Input
        type="number"
        placeholder="Payment Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        step="0.01"
        min="0"
      />
      <Button type="submit">Add Payment</Button>
    </form>
  );
}