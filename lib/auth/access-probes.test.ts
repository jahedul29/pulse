import { act } from "react";
import { renderHook } from "@testing-library/react";
import { useAccessProbes, useProbeAllowed, useProbeDenied, useProbeResults } from "./access-probes";
import { useAuthStore } from "./store";

function signIn(adminId: string) {
  useAuthStore.setState({
    session: { email: `${adminId}@abapro.ai`, name: adminId, role: "admin", token: "t", issuedAt: 0, adminId },
  });
}

describe("access probe store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAccessProbes.setState({ owner: null, results: {} });
    signIn("u-1");
  });

  it("merges results for the same admin and starts fresh for another admin", () => {
    act(() => useAccessProbes.getState().record("u-1", { "/a": true }));
    act(() => useAccessProbes.getState().record("u-1", { "/b": false }));
    expect(useAccessProbes.getState().results).toEqual({ "/a": true, "/b": false });
    act(() => useAccessProbes.getState().record("u-2", { "/b": true }));
    expect(useAccessProbes.getState()).toMatchObject({ owner: "u-2", results: { "/b": true } });
  });

  it("only hands out results that belong to the signed-in admin", () => {
    act(() => useAccessProbes.getState().record("u-2", { "/a": true }));
    const { result } = renderHook(() => ({
      results: useProbeResults(),
      allowed: useProbeAllowed("/a"),
      denied: useProbeDenied("/a"),
    }));
    expect(result.current).toEqual({ results: {}, allowed: false, denied: false });
  });

  it("drops anything but true/false when loading saved results", async () => {
    sessionStorage.setItem(
      "abapro-access-probes",
      JSON.stringify({ state: { owner: "u-1", results: { "/a": true, "/b": "yes", "/c": null } }, version: 0 }),
    );
    await useAccessProbes.persist.rehydrate();
    expect(useAccessProbes.getState()).toMatchObject({ owner: "u-1", results: { "/a": true } });

    sessionStorage.setItem("abapro-access-probes", JSON.stringify({ state: { owner: 7, results: null }, version: 0 }));
    await useAccessProbes.persist.rehydrate();
    expect(useAccessProbes.getState()).toMatchObject({ owner: null, results: {} });
  });
});
