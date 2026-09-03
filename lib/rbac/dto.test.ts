import { permissionCode, permissionLabel, resourceName, type PermissionDto } from "./dto";

const base = { id: 1, module_id: 1, action: "EDIT", is_sensitive: false } as PermissionDto;

describe("permission helpers", () => {
  it("resourceName reads the inner resource string from the object shape", () => {
    expect(resourceName({ ...base, resource: { resource: "clients", action: "EDIT" } })).toBe("clients");
  });

  it("resourceName reads a plain string resource", () => {
    expect(resourceName({ ...base, resource: "clients" })).toBe("clients");
  });

  it("resourceName is empty when missing", () => {
    expect(resourceName({ ...base, resource: undefined })).toBe("");
    expect(resourceName({ ...base, resource: null })).toBe("");
  });

  it("permissionCode prefers code", () => {
    expect(
      permissionCode({ ...base, code: "CLIENTS.clients.EDIT", resource: { resource: "clients" } }),
    ).toBe("CLIENTS.clients.EDIT");
  });

  it("permissionCode falls back to resource:action, then action", () => {
    expect(permissionCode({ ...base, resource: "clients" })).toBe("clients:EDIT");
    expect(permissionCode({ ...base })).toBe("EDIT");
  });

  it("permissionLabel prefers description, else code", () => {
    expect(permissionLabel({ ...base, description: "Manage clients" })).toBe("Manage clients");
    expect(permissionLabel({ ...base, code: "X.y.EDIT" })).toBe("X.y.EDIT");
  });

  it("permissionLabel never stringifies the resource object", () => {
    const label = permissionLabel({ ...base, resource: { resource: "clients", action: "EDIT" } });
    expect(typeof label).toBe("string");
    expect(label).not.toContain("[object");
  });
});
