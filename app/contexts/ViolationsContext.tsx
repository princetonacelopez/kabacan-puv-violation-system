// app/contexts/ViolationsContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type Violation = {
  id: string;
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

type ViolationsContextType = {
  violations: Violation[];
  setViolations: (violations: Violation[]) => void;
  viewViolations: GroupedViolation | null;
  setViewViolations: (group: GroupedViolation | null) => void;
  searchPlateNumber: string;
  setSearchPlateNumber: (value: string) => void;
};

const ViolationsContext = createContext<ViolationsContextType | undefined>(undefined);

export function ViolationsProvider({ children }: { children: ReactNode }) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [viewViolations, setViewViolations] = useState<GroupedViolation | null>(null);
  const [searchPlateNumber, setSearchPlateNumber] = useState("");

  return (
    <ViolationsContext.Provider
      value={{
        violations,
        setViolations,
        viewViolations,
        setViewViolations,
        searchPlateNumber,
        setSearchPlateNumber,
      }}
    >
      {children}
    </ViolationsContext.Provider>
  );
}

export function useViolations() {
  const context = useContext(ViolationsContext);
  if (!context) {
    throw new Error("useViolations must be used within a ViolationsProvider");
  }
  return context;
}