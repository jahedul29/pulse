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

function ok(data: unknown, status = 200) {
  return { success: true, message: "", status, data };
}

function list(data: unknown[]) {
  return {
    success: true,
    message: "",
    status: 200,
    data,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: data.length, from: 1, to: data.length },
  };
}

export async function mockAdminIdentity(page: Page, password = "abapro") {
  const roles = [
    { id: 1, name: "superadmin", description: "Full access", is_system: true, permissions: [] },
    { id: 2, name: "admin", description: "Admin", is_system: true, permissions: [] },
  ];
  let nextId = 100;

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

    return json(ok(null));
  });
}
