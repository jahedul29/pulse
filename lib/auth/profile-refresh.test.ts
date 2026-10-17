import { ApiError } from "@/lib/api/errors";
import { refreshProfileAfterForbidden, registerProfileRefresh } from "./profile-refresh";

describe("refreshProfileAfterForbidden", () => {
  afterEach(() => {
    registerProfileRefresh(null);
    jest.useRealTimers();
  });

  it("refreshes after a 403 at most once every ten seconds and ignores other errors", () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const refresh = jest.fn();
    registerProfileRefresh(refresh);
    const forbidden = new ApiError("forbidden", 403, "Forbidden");

    refreshProfileAfterForbidden(new ApiError("server", 500, "boom"));
    expect(refresh).not.toHaveBeenCalled();

    refreshProfileAfterForbidden(forbidden);
    refreshProfileAfterForbidden(forbidden);
    expect(refresh).toHaveBeenCalledTimes(1);

    jest.setSystemTime(1_000_000 + 10_000);
    refreshProfileAfterForbidden(forbidden);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
