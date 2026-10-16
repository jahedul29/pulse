import { render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import mockMessages from "../../messages/en.json";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "./data-table";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = messages[ns]?.[key];
      let text = typeof value === "string" ? value : key;
      for (const [name, replacement] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, String(replacement));
      return text;
    },
  };
});

interface Row {
  name: string;
  country: string;
}

const rows: Row[] = [
  { name: "Dubai", country: "1" },
  { name: "Abu Dhabi", country: "1" },
  { name: "Beijing", country: "2" },
];

const columns: ColumnDef<Row, unknown>[] = [
  { id: "name", accessorKey: "name", header: "Name", size: 160 },
  {
    id: "country",
    accessorKey: "country",
    header: "Country",
    size: 120,
    meta: { filter: "select", filterOptions: [{ value: "1", label: "UAE" }, { value: "2", label: "China" }] },
  },
];

function renderTable(initialColumnFilters?: Array<{ id: string; value: unknown }>) {
  render(
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search"
        emptyLabel="Nothing"
        itemsLabel="rows"
        initialColumnFilters={initialColumnFilters}
      />
    </TooltipProvider>,
  );
}

describe("DataTable initialColumnFilters", () => {
  it("starts with the given column filter applied", () => {
    renderTable([{ id: "country", value: ["2"] }]);
    expect(screen.getByText("Beijing")).toBeInTheDocument();
    expect(screen.queryByText("Dubai")).not.toBeInTheDocument();
  });

  it("shows every row without one", () => {
    renderTable();
    expect(screen.getByText("Dubai")).toBeInTheDocument();
    expect(screen.getByText("Beijing")).toBeInTheDocument();
  });
});
