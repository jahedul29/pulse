import {
  alertRoutesStateToParams,
  deliveriesStateToParams,
  liveAlertsStateToParams,
} from "./list-params";
import type { ServerTableState } from "@/components/common/data-table";

function state(partial: Partial<ServerTableState>): ServerTableState {
  return { pageIndex: 0, pageSize: 10, search: "", sorting: [], columnFilters: [], ...partial };
}

describe("liveAlertsStateToParams", () => {
  it("maps severity/timestamp/status sort + severity/channel/recipient filters", () => {
    const params = liveAlertsStateToParams(
      state({
        sorting: [{ id: "severity", desc: false }],
        columnFilters: [
          { id: "severity", value: ["CRITICAL"] },
          { id: "status", value: ["SENT"] },
          { id: "channel", value: ["3"] },
          { id: "recipient", value: ["u1"] },
        ],
      }),
    );
    expect(params.sort).toEqual({ severity: "asc" });
    expect(params.filters).toEqual({
      severity: ["CRITICAL"],
      status: ["SENT"],
      channel_id: ["3"],
      admin_account_id: ["u1"],
    });
  });

  it("maps the timestamp sort id to sent_at", () => {
    expect(liveAlertsStateToParams(state({ sorting: [{ id: "timestamp", desc: true }] })).sort).toEqual({
      sent_at: "desc",
    });
  });

  it("defaults on null", () => {
    expect(liveAlertsStateToParams(null)).toEqual({ page: 1, perPage: 10 });
  });
});

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

  it("maps the severity filter + sort to severity", () => {
    const params = deliveriesStateToParams(
      state({
        sorting: [{ id: "severity", desc: false }],
        columnFilters: [{ id: "severity", value: ["CRITICAL", "HIGH"] }],
      }),
    );
    expect(params.sort).toEqual({ severity: "asc" });
    expect(params.filters).toEqual({ severity: ["CRITICAL", "HIGH"] });
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

  it("maps the severity filter + sort to severity", () => {
    const params = alertRoutesStateToParams(
      state({
        sorting: [{ id: "severity", desc: true }],
        columnFilters: [{ id: "severity", value: ["HIGH"] }],
      }),
    );
    expect(params.sort).toEqual({ severity: "desc" });
    expect(params.filters).toEqual({ severity: ["HIGH"] });
  });
});
