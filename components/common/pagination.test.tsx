import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { Pagination } from "./pagination";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  return {
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = messages[ns]?.[key];
      let str = typeof value === "string" ? value : key;
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v));
      return str;
    },
  };
});

describe("Pagination", () => {
  it("windows page numbers with ellipsis and jumps on click", async () => {
    const onPage = jest.fn();
    render(
      <Pagination page={50} pageCount={100} total={2500} start={1226} end={1250} onPage={onPage} label="rows" />,
    );

    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 50" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 100" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 10" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Go to page 1" }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("prev / next step by one page", async () => {
    const onPage = jest.fn();
    render(
      <Pagination page={50} pageCount={100} total={2500} start={1226} end={1250} onPage={onPage} label="rows" />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPage).toHaveBeenCalledWith(49);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPage).toHaveBeenCalledWith(51);
  });

  it("marks the current page and renders a rows-per-page control", () => {
    render(
      <Pagination
        page={3}
        pageCount={4}
        total={100}
        start={51}
        end={75}
        pageSize={25}
        onPage={jest.fn()}
        onPageSize={jest.fn()}
        pageSizeOptions={[10, 25, 50, 100]}
        label="rows"
      />,
    );
    expect(screen.getByRole("button", { name: "Go to page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Rows per page")).toBeInTheDocument();
  });
});
