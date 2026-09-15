import { alertRoutesStateToParams, deliveriesStateToParams } from "./list-params";
import type { ServerTableState } from "@/components/common/data-table";

function state(partial: Partial<ServerTableState>): ServerTableState {
  return { pageIndex: 0, pageSize: 10, search: "", sorting: [], columnFilters: [], ...partial };
}

describe("deliveriesStateToParams", () => {
  it("defaults on null", () => {
    expect(deliveriesStateToParams(null)).toEqual({ page: 1, perPage: 10 });
  });

  it("maps page, search, sort and filters", () => {
    const params = deliveriesStateToParams(
      state({
        pageIndex: 2,
        pageSize: 25,
        search: "  boom  ",
        sorting: [{ id: "timestamp", desc: true }],
        columnFilters: [
          { id: "status", value: ["SENT", "FAILED"] },
          { id: "channel", value: ["3", "5"] },
          { id: "campaign", value: ["c1"] },
          { id: "recipient", value: ["u1", "u2"] },
        ],
      }),
    );
    expect(params).toEqual({
      page: 3,
      perPage: 25,
      search: "boom",
      sort: { sent_at: "desc" },
      filters: {
        status: ["SENT", "FAILED"],
        channel_id: ["3", "5"],
        campaign_id: ["c1"],
        admin_account_id: ["u1", "u2"],
      },
    });
  });

  it("omits sort and filters when empty", () => {
    expect(deliveriesStateToParams(state({}))).toEqual({ page: 1, perPage: 10, search: undefined });
  });
});

describe("alertRoutesStateToParams", () => {
  it("maps sort and filters", () => {
    const params = alertRoutesStateToParams(
      state({
        sorting: [{ id: "priority", desc: false }],
        columnFilters: [
          { id: "active", value: ["1"] },
          { id: "audience", value: ["ROLE", "USER_IDS"] },
          { id: "channel", value: ["5"] },
        ],
      }),
    );
    expect(params).toEqual({
      page: 1,
      perPage: 10,
      search: undefined,
      sort: { priority: "asc" },
      filters: { is_active: ["1"], audience_type: ["ROLE", "USER_IDS"], channel_id: ["5"] },
    });
  });
});
