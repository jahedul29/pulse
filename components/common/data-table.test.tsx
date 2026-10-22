import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import mockMessages from "../../messages/en.json";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable, type DataTableController } from "./data-table";

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

describe("DataTable column widths", () => {
  const widthColumns: ColumnDef<Row, unknown>[] = [
    { id: "name", accessorKey: "name", header: "Name", size: 180, maxSize: 320 },
    { id: "country", accessorKey: "country", header: "Country", size: 120 },
  ];
  let containerWidth = 0;
  const clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset.slot === "table-container" ? containerWidth : 0;
      },
    });
  });

  afterAll(() => {
    if (clientWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidth);
  });

  function renderAt(width: number) {
    containerWidth = width;
    render(
      <TooltipProvider>
        <DataTable columns={widthColumns} data={rows} searchPlaceholder="Search" emptyLabel="Nothing" itemsLabel="rows" />
      </TooltipProvider>,
    );
    const table = screen.getByRole("table");
    const headers = table.querySelectorAll<HTMLElement>("thead th");
    return { table, headers };
  }

  it("grows columns past their maximum up to one and a half times it before leaving space", () => {
    const { table, headers } = renderAt(550);
    expect(table.style.width).toBe("550px");
    expect(headers).toHaveLength(2);
    expect(headers[0].style.width).toBe("400px");
    expect(headers[1].style.width).toBe("150px");
  });

  it("leaves the rest of the row empty once every column has grown as far as it may", () => {
    const { table, headers } = renderAt(1000);
    expect(table.style.width).toBe("1000px");
    expect(headers).toHaveLength(3);
    expect(headers[0].style.width).toBe("480px");
    expect(headers[1].style.width).toBe("180px");
    expect(headers[2]).toHaveAttribute("aria-hidden", "true");
    expect(headers[2].style.width).toBe("340px");
    expect(table.querySelector("tbody tr[data-row]")?.lastElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("shares the space between minimum and maximum without a filler", () => {
    const { table, headers } = renderAt(400);
    expect(table.style.width).toBe("400px");
    expect(headers).toHaveLength(2);
    expect(headers[0].style.width).toBe("280px");
    expect(headers[1].style.width).toBe("120px");
  });

  it("keeps the minimum widths and scrolls when the window is too narrow", () => {
    const { table, headers } = renderAt(250);
    expect(table.style.width).toBe("300px");
    expect(headers[0].style.width).toBe("180px");
  });

  it("names a clipped cell's full text on hover", () => {
    renderAt(1000);
    const cell = screen.getByText("Abu Dhabi").closest("td")!;
    Object.defineProperty(cell, "scrollWidth", { configurable: true, value: 400 });
    fireEvent.pointerOver(cell);
    expect(cell).toHaveAttribute("title", "Abu Dhabi");
  });
});

describe("DataTable clipped-text tooltip", () => {
  it("leaves hidden avatar initials out of the tooltip", () => {
    const withAvatar: ColumnDef<Row, unknown>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        size: 160,
        cell: ({ row }) => (
          <span>
            <span aria-hidden>DO</span>
            <span>{row.original.name}</span>
          </span>
        ),
      },
    ];
    render(
      <TooltipProvider>
        <DataTable columns={withAvatar} data={rows.slice(0, 1)} searchPlaceholder="Search" emptyLabel="Nothing" itemsLabel="rows" />
      </TooltipProvider>,
    );
    const cell = screen.getByText("Dubai").closest("td")!;
    Object.defineProperty(cell, "scrollWidth", { configurable: true, value: 400 });
    fireEvent.pointerOver(cell);
    expect(cell).toHaveAttribute("title", "Dubai");
  });
});

describe("DataTable clipping", () => {
  it("clips only columns with a set width, so unsized action cells keep their buttons visible", () => {
    const mixed: ColumnDef<Row, unknown>[] = [
      { id: "name", accessorKey: "name", header: "Name", size: 160 },
      { id: "actions", header: "Actions", cell: () => <button type="button">Open</button> },
      { id: "kept", accessorKey: "country", header: "Kept", size: 120, meta: { noClip: true } },
    ];
    render(
      <TooltipProvider>
        <DataTable columns={mixed} data={rows.slice(0, 1)} searchPlaceholder="Search" emptyLabel="Nothing" itemsLabel="rows" />
      </TooltipProvider>,
    );
    const [name, actions, kept] = screen.getByText("Dubai").closest("tr")!.querySelectorAll("td");
    expect(name).toHaveClass("overflow-hidden");
    expect(name).toHaveAttribute("data-clip");
    expect(actions).not.toHaveClass("overflow-hidden");
    expect(actions).not.toHaveAttribute("data-clip");
    expect(kept).not.toHaveClass("overflow-hidden");
  });
});

describe("DataTable record selection", () => {
  const many: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: `City ${String(i + 1).padStart(2, "0")}`, country: "1" }));

  function renderSelectable(props: { activeRowId?: string | null; onOrderedIdsChange?: (ids: string[]) => void } = {}) {
    const controller = createRef<DataTableController>();
    const view = render(
      <TooltipProvider>
        <DataTable
          columns={columns}
          data={many}
          pageSize={5}
          searchPlaceholder="Search"
          emptyLabel="Nothing"
          itemsLabel="rows"
          getRowId={(row) => row.name}
          controllerRef={controller}
          {...props}
        />
      </TooltipProvider>,
    );
    return { controller, view };
  }

  it("reports the ordered row ids once per change", () => {
    const onOrderedIdsChange = jest.fn();
    renderSelectable({ onOrderedIdsChange });
    expect(onOrderedIdsChange).toHaveBeenCalledTimes(1);
    expect(onOrderedIdsChange.mock.calls[0][0]).toHaveLength(12);
    expect(onOrderedIdsChange.mock.calls[0][0][0]).toBe("City 01");
  });

  it("shows the page that holds the active row and highlights it", () => {
    renderSelectable({ activeRowId: "City 08" });
    const row = screen.getByText("City 08").closest("tr");
    expect(row).toHaveAttribute("data-active");
    expect(screen.queryByText("City 01")).not.toBeInTheDocument();
  });

  it("lets the screen change the page", () => {
    const { controller } = renderSelectable();
    expect(screen.getByText("City 01")).toBeInTheDocument();
    act(() => controller.current?.goToPage(2));
    expect(screen.getByText("City 11")).toBeInTheDocument();
    expect(screen.queryByText("City 01")).not.toBeInTheDocument();
  });
});

describe("DataTable fill mode", () => {
  it("lets the rows scroll under a pinned header from tablet width up and drops the blank filler rows", () => {
    render(
      <TooltipProvider>
        <DataTable fill columns={columns} data={rows} searchPlaceholder="Search" emptyLabel="Nothing" itemsLabel="rows" />
      </TooltipProvider>,
    );
    const table = screen.getByRole("table");
    expect(table.parentElement?.className).toContain("md:overflow-y-auto");
    expect(table.querySelector("thead th")?.className).toContain("md:sticky");
    expect(table.querySelector("thead th")?.className).toContain("md:top-0");
  });

  it("controls a column filter from outside the table", () => {
    const controller = createRef<DataTableController>();
    render(
      <TooltipProvider>
        <DataTable columns={columns} data={rows} searchPlaceholder="Search" emptyLabel="Nothing" itemsLabel="rows" controllerRef={controller} />
      </TooltipProvider>,
    );
    act(() => controller.current?.setColumnFilter("country", ["2"]));
    expect(screen.getByText("Beijing")).toBeInTheDocument();
    expect(screen.queryByText("Dubai")).not.toBeInTheDocument();
  });
});

