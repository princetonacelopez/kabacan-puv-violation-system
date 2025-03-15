// components/ViolationSearch.tsx
"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type ViolationSearchProps = {
  searchPlateNumber: string;
  setSearchPlateNumber: (value: string) => void;
};

export default function ViolationSearch({ searchPlateNumber, setSearchPlateNumber }: ViolationSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by Plate Number"
        value={searchPlateNumber}
        onChange={(e) => setSearchPlateNumber(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}