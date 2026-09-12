import type { Page, Route } from "@playwright/test";

const OWNER = {
  id: "00000000-0000-4000-8000-000000000001",
  staff_id: 1,
  email: "owner@abapro.health",
  preferred_language: "en",
  status: "active",
  roles: ["superadmin"],
  permissions: [],
};

function authToken() {
  return {
    access_token: "e2e-access-token",
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    expires_in: 86400,
    refresh_expires_in: 604800,
    user: OWNER,
  };
}

const MODULES = [{ id: 1, code: "CLIENTS", name: "Clients", display_order: 1 }];

const PERMISSIONS = [
  {
    id: 1,
    module_id: 1,
    module: { id: 1, code: "CLIENTS", name: "Clients" },
    resource: { resource: "clients", action: "VIEW" },
    action: "VIEW",
    code: "CLIENTS.clients.VIEW",
    description: "View clients",
    is_sensitive: false,
  },
  {
    id: 2,
    module_id: 1,
    module: { id: 1, code: "CLIENTS", name: "Clients" },
    resource: { resource: "clients", action: "EDIT" },
    action: "EDIT",
    code: "CLIENTS.clients.EDIT",
    description: "Manage clients",
    is_sensitive: true,
  },
];

const UA_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

function ok(data: unknown, status = 200) {
  return { success: true, message: "", status, data };
}

function list(data: unknown[]) {
  return {
    success: true,
    message: "",
    status: 200,
    data,
    meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length },
  };
}

function fail(messages: string[], status = 422) {
  return { success: false, message: "Validation failed", errors: [{ field: "status", messages }], status };
}

export async function mockAdminIdentity(page: Page, password = "abapro") {
  const roles = [
    { id: 1, name: "Superadmin", description: "Full access", is_system: true, permissions: [] },
    { id: 2, name: "Admin", description: "Admin", is_system: true, permissions: [] },
  ];
  let nextId = 100;

  const staffRef = (first: string, last: string) => ({ first_name: first, last_name: last });
  const account = (email: string, first: string, last: string) => ({ email, staff: staffRef(first, last) });

  const users: Record<string, unknown>[] = [
    {
      id: "u-dana",
      staff_id: 11,
      email: "dana.okonkwo@abapro.health",
      preferred_language: "en",
      status: "ACTIVE",
      invited_by_admin_id: "owner@abapro.health",
      created_at: "2026-01-05T09:00:00Z",
      activated_at: "2026-01-06T09:00:00Z",
      last_login_at: "2026-09-01T08:00:00Z",
      updated_at: "2026-09-01T08:00:00Z",
      staff: { id: 11, first_name: "Dana", last_name: "Okonkwo", personal_email: "dana.okonkwo@abapro.health" },
      roles: [{ id: 2, name: "Admin" }],
    },
    {
      id: "u-nadia",
      staff_id: 12,
      email: "nadia.kaur@abapro.health",
      preferred_language: "en",
      status: "ACTIVE",
      invited_by_admin_id: "owner@abapro.health",
      created_at: "2026-02-10T09:00:00Z",
      activated_at: "2026-02-11T09:00:00Z",
      last_login_at: "2026-09-02T08:00:00Z",
      updated_at: "2026-09-02T08:00:00Z",
      staff: { id: 12, first_name: "Nadia", last_name: "Kaur", personal_email: "nadia.kaur@abapro.health" },
      roles: [{ id: 2, name: "Admin" }],
    },
    {
      id: "u-noah",
      staff_id: 13,
      email: "noah.weiss@abapro.health",
      preferred_language: "en",
      status: "ACTIVE",
      invited_by_admin_id: "owner@abapro.health",
      created_at: "2026-03-15T09:00:00Z",
      activated_at: "2026-03-16T09:00:00Z",
      last_login_at: "2026-09-03T08:00:00Z",
      updated_at: "2026-09-03T08:00:00Z",
      staff: { id: 13, first_name: "Noah", last_name: "Weiss", personal_email: "noah.weiss@abapro.health" },
      roles: [],
    },
  ];

  const invitations: Record<string, unknown>[] = [];

  const staff = [
    { id: 501, first_name: "Bruno", last_name: "Costa", personal_email: "bruno.costa@abapro.health" },
    { id: 502, first_name: "Chen", last_name: "Li", personal_email: "chen.li@abapro.health" },
  ];

  const actions = [
    {
      id: "act-1",
      admin_account_id: "u-dana",
      admin_account: account("dana.okonkwo@abapro.health", "Dana", "Okonkwo"),
      action_code: "CLIENT_REFUND",
      target_service: "billing",
      target_type: "Order",
      target_id: "ord-88",
      target_summary: "Refund client order",
      request_payload: { amount: 120, reason: "duplicate charge", items: ["invoice", "fee"] },
      result: "SUCCESS",
      severity: "INFO",
      correlation_id: "corr-1",
      user_agent: UA_MAC,
      created_at: "2026-09-01T10:00:00Z",
    },
  ];

  const changes = [
    {
      id: "chg-1",
      schema_name: "public",
      table_name: "orders",
      row_pk: "ord-88",
      operation: "UPDATE",
      old_data: { status: "paid" },
      new_data: { status: "refunded" },
      changed_columns: ["status"],
      actor_admin_id: "u-dana",
      actor: account("dana.okonkwo@abapro.health", "Dana", "Okonkwo"),
      admin_action_log_id: "act-1",
      created_at: "2026-09-01T10:00:05Z",
    },
  ];

  await page.route("**/api/admin-identity/**", async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname.replace(/\/api\/admin-identity/, "");

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (pathname === "/login" && method === "POST") {
      const sent = request.postDataJSON() as { password?: string };
      if (sent?.password === password) return json(ok(authToken()));
      return json(
        {
          success: false,
          message: "Validation failed",
          errors: [{ field: "email", messages: ["Invalid credentials"] }],
          status: 422,
        },
        422,
      );
    }

    if (pathname === "/roles" && method === "GET") return json(list(roles));
    if (pathname === "/roles" && method === "POST") {
      const sent = request.postDataJSON() as { name: string; description?: string };
      const role = {
        id: nextId++,
        name: sent.name,
        description: sent.description ?? "",
        is_system: false,
        permissions: [],
      };
      roles.push(role);
      return json(ok(role, 201), 201);
    }
    const roleMatch = pathname.match(/^\/roles\/(\d+)$/);
    if (roleMatch && method === "GET") {
      const role = roles.find((entry) => entry.id === Number(roleMatch[1])) ?? roles[0];
      return json(ok(role));
    }
    if (/^\/roles\/\d+\/permissions$/.test(pathname) && method === "PUT") return json(ok({}));
    if (roleMatch && (method === "PUT" || method === "DELETE")) return json(ok({}));

    if (pathname === "/permissions" && method === "GET") return json(list(PERMISSIONS));
    if (pathname === "/permission-modules" && method === "GET") return json(list(MODULES));

    if (pathname === "/users" && method === "GET") return json(list(users));
    const userMatch = pathname.match(/^\/users\/([^/]+)$/);
    if (userMatch && method === "GET") {
      const user = users.find((entry) => entry.id === userMatch[1]) ?? users[0];
      return json(ok(user));
    }
    if (userMatch && method === "PUT") {
      const id = userMatch[1];
      if (id === "u-noah") return json(fail(["Unable to change status."], 500), 500);
      const sent = request.postDataJSON() as { status?: string };
      const user = users.find((entry) => entry.id === id);
      if (user && sent?.status) user.status = sent.status;
      return json(ok(user ?? users[0]));
    }
    if (/^\/users\/[^/]+\/roles$/.test(pathname) && method === "PUT") return json(ok({}));

    if (pathname === "/invitations" && method === "GET") return json(list(invitations));
    if (pathname === "/invitations" && method === "POST") {
      const sent = request.postDataJSON() as { staff_id: number };
      const member = staff.find((entry) => entry.id === sent.staff_id);
      const invitation = {
        id: `inv-${sent.staff_id}`,
        staff_id: sent.staff_id,
        email: member?.personal_email ?? "",
        status: "pending",
        created_at: "2026-09-05T09:00:00Z",
        staff: member,
      };
      invitations.push(invitation);
      users.push({
        id: `u-${sent.staff_id}`,
        staff_id: sent.staff_id,
        email: member?.personal_email ?? "",
        preferred_language: "en",
        status: "PENDING",
        invited_by_admin_id: "owner@abapro.health",
        created_at: "2026-09-05T09:00:00Z",
        last_login_at: null,
        updated_at: "2026-09-05T09:00:00Z",
        staff: member,
        roles: [],
      });
      return json(ok(invitation, 201), 201);
    }
    if (/^\/invitations\/[^/]+$/.test(pathname) && method === "DELETE") return json(ok(null));

    if (pathname === "/staff" && method === "GET") return json(list(staff));

    if (pathname === "/admin-action-logs" && method === "GET") return json(list(actions));
    const actionMatch = pathname.match(/^\/admin-action-logs\/([^/]+)$/);
    if (actionMatch && method === "GET") {
      const action = actions.find((entry) => entry.id === actionMatch[1]) ?? actions[0];
      return json(ok(action));
    }

    if (pathname === "/change-logs" && method === "GET") return json(list(changes));
    const changeMatch = pathname.match(/^\/change-logs\/([^/]+)$/);
    if (changeMatch && method === "GET") {
      const change = changes.find((entry) => entry.id === changeMatch[1]) ?? changes[0];
      return json(ok(change));
    }

    if (pathname === "/login-audit-logs" && method === "GET") return json(list([]));

    if (method === "GET") return json(list([]));
    return json(ok(null));
  });
}
