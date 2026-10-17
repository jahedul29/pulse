import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { probeEndpoint } from "./probe-api";

jest.mock("../api/client", () => ({ apiFetch: jest.fn() }));

describe("probeEndpoint", () => {
  it("asks for a single row and reports allowed on success", async () => {
    jest.mocked(apiFetch).mockResolvedValueOnce({});
    await expect(probeEndpoint("/api/admin-identity/change-logs")).resolves.toBe("allowed");
    expect(apiFetch).toHaveBeenCalledWith("/api/admin-identity/change-logs", { query: { per_page: 1 } });
  });

  it("reports denied for a 403 and unreachable for anything else", async () => {
    jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError("forbidden", 403, "Forbidden"));
    await expect(probeEndpoint("/x")).resolves.toBe("denied");
    jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError("server", 500, "boom"));
    await expect(probeEndpoint("/x")).resolves.toBe("unreachable");
    jest.mocked(apiFetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(probeEndpoint("/x")).resolves.toBe("unreachable");
  });
});
