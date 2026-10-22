import { redirect } from "next/navigation";
import Page from "./page";

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

describe("old audit log route", () => {
  beforeEach(() => jest.mocked(redirect).mockClear());

  it("sends /admin/audit/actions to the audit log", async () => {
    await Page({ searchParams: Promise.resolve({}) });
    expect(redirect).toHaveBeenCalledWith("/admin/audit/log");
  });

  it("keeps the query so shared entry links still open their record", async () => {
    await Page({ searchParams: Promise.resolve({ open: "36", tag: ["a", "b"] }) });
    expect(redirect).toHaveBeenCalledWith("/admin/audit/log?open=36&tag=a&tag=b");
  });
});
