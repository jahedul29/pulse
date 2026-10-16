import type { Metadata } from "next";
import { CountriesList } from "@/components/locations/countries-list";

export const metadata: Metadata = { title: "Countries" };

export default function CountriesPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <CountriesList />
    </div>
  );
}
