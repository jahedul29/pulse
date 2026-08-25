import { usePolicyStore } from "./store";
import { seedVersions } from "./mock";
import type { SecurityPolicy } from "./types";

const s = () => usePolicyStore.getState();

beforeEach(() => {
  usePolicyStore.setState({ versions: seedVersions() });
});

describe("usePolicyStore.savePolicy", () => {
  it("closes the current version and appends a new open one", () => {
    const beforeCount = s().versions.length;
    const prev = s().versions.find((v) => v.effectiveTo == null);
    expect(prev).toBeDefined();

    const next: SecurityPolicy = { ...(prev as NonNullable<typeof prev>).policy, lockoutThreshold: 3 };
    s().savePolicy(next, "Tighten lockout", "Tester");

    expect(s().versions.length).toBe(beforeCount + 1);

    const open = s().versions.filter((v) => v.effectiveTo == null);
    expect(open).toHaveLength(1);
    expect(open[0].policy.lockoutThreshold).toBe(3);
    expect(open[0].reason).toBe("Tighten lockout");
    expect(open[0].changedBy).toBe("Tester");

    const closedPrev = s().versions.find((v) => v.id === prev?.id);
    expect(closedPrev?.effectiveTo).not.toBeNull();
  });
});
