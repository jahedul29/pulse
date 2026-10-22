import { apiList } from "@/lib/api/client";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH } from "@/lib/api/audit-paths";
import { countActionChanges, findPreviousChange, listTargetHistory } from "./audit-api";
import type { ChangeLogEntry } from "./types";

jest.mock("../api/client", () => ({ apiList: jest.fn(), apiData: jest.fn() }));

const entry: ChangeLogEntry = {
  id: "8",
  createdAt: Date.parse("2026-10-17T01:52:11Z"),
  actionId: "411",
  actionCode: "INVITATIONS_REVOKE",
  action: null,
  actorId: "u-1",
  actorName: "System Admin",
  table: "admin_invitations",
  recordId: "13",
  operation: "UPDATE",
  changes: [],
  prevRowHash: "prev-hash",
  rowHash: "this-hash",
};

describe("countActionChanges", () => {
  it("asks for one row filtered by the action and returns the total", async () => {
    jest.mocked(apiList).mockResolvedValueOnce({ data: [], meta: { total: 3 } } as never);
    await expect(countActionChanges("411")).resolves.toBe(3);
    expect(apiList).toHaveBeenLastCalledWith(CHANGE_LOGS_PATH, {
      query: expect.objectContaining({ per_page: 1, "filters[admin_action_log_id]": "411" }),
    });
  });
});

describe("findPreviousChange", () => {
  it("returns null without asking when the change is the first to its record", async () => {
    jest.mocked(apiList).mockClear();
    await expect(findPreviousChange({ ...entry, prevRowHash: null })).resolves.toBeNull();
    expect(apiList).not.toHaveBeenCalled();
  });

  it("looks up the record's history up to this change and picks the row whose hash it links to", async () => {
    jest.mocked(apiList).mockResolvedValueOnce({
      data: [
        { id: "8", table_name: "admin_invitations", row_pk: "13", operation: "UPDATE", row_hash: "this-hash" },
        { id: "7", table_name: "admin_invitations", row_pk: "13", operation: "INSERT", row_hash: "prev-hash" },
      ],
      meta: { total: 2 },
    } as never);

    const previous = await findPreviousChange(entry);

    expect(previous?.id).toBe("7");
    expect(previous?.operation).toBe("INSERT");
    expect(apiList).toHaveBeenLastCalledWith(CHANGE_LOGS_PATH, {
      query: expect.objectContaining({
        "filters[table_name]": "admin_invitations",
        "filters[row_pk]": "13",
        "filters[created_at_to]": "2026-10-17T01:52:11.000Z",
        "sort[created_at]": "desc",
        relations: ["actor", "adminActionLog"],
      }),
    });
  });

  it("returns null when no row carries the linked hash", async () => {
    jest.mocked(apiList).mockResolvedValueOnce({
      data: [{ id: "8", table_name: "admin_invitations", row_pk: "13", operation: "UPDATE", row_hash: "this-hash" }],
      meta: { total: 1 },
    } as never);
    await expect(findPreviousChange(entry)).resolves.toBeNull();
  });
});

describe("listTargetHistory", () => {
  it("takes the newest entries for one record and shows them oldest first, with the full count", async () => {
    jest.mocked(apiList).mockResolvedValueOnce({
      data: [{ id: "2", created_at: "2026-10-02T00:00:00Z" }, { id: "1", created_at: "2026-10-01T00:00:00Z" }],
      meta: { total: 70 },
    } as never);
    const history = await listTargetHistory("inv-1");
    expect(apiList).toHaveBeenLastCalledWith(ADMIN_ACTION_LOGS_PATH, {
      query: expect.objectContaining({ "filters[target_id]": "inv-1", "sort[created_at]": "desc" }),
    });
    expect(history.entries.map((entry) => entry.id)).toEqual(["1", "2"]);
    expect(history.total).toBe(70);
  });
});
