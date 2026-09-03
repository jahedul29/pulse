import { usePolicyStore } from "./store";
import { seedVersions } from "./mock";
import type { SecurityPolicy } from "./types";

const getPolicyState = () => usePolicyStore.getState();

beforeEach(() => {
  usePolicyStore.setState({ versions: seedVersions() });
});

describe("usePolicyStore.savePolicy", () => {
  it("closes the current version and appends a new open one", () => {
    const beforeCount = getPolicyState().versions.length;
    const prev = getPolicyState().versions.find((version) => version.effectiveTo == null);
    expect(prev).toBeDefined();

    const next: SecurityPolicy = { ...(prev as NonNullable<typeof prev>).policy, lockoutThreshold: 3 };
    getPolicyState().savePolicy(next, "Tighten lockout", "Tester");

    expect(getPolicyState().versions.length).toBe(beforeCount + 1);

    const open = getPolicyState().versions.filter((version) => version.effectiveTo == null);
    expect(open).toHaveLength(1);
    expect(open[0].policy.lockoutThreshold).toBe(3);
    expect(open[0].reason).toBe("Tighten lockout");
    expect(open[0].changedBy).toBe("Tester");

    const closedPrev = getPolicyState().versions.find((version) => version.id === prev?.id);
    expect(closedPrev?.effectiveTo).not.toBeNull();
  });
});
