import { useNotificationStore } from "./store";
import { seedMappings, seedRouting, seedTemplates } from "./mock";
import type { MessageTemplate } from "./types";

beforeEach(() => {
  useNotificationStore.setState({
    templates: seedTemplates(),
    mappings: seedMappings(),
    routing: seedRouting(),
  });
});

const draft: MessageTemplate = {
  code: "SYS_NEW",
  category: "system",
  en: "hello",
  ar: "مرحبا",
  updatedAt: 1,
};

describe("useNotificationStore", () => {
  it("upsertTemplate inserts a new template", () => {
    const before = useNotificationStore.getState().templates.length;
    useNotificationStore.getState().upsertTemplate(draft);
    const after = useNotificationStore.getState().templates;
    expect(after.length).toBe(before + 1);
    expect(after.find((template) => template.code === "SYS_NEW")?.en).toBe("hello");
  });

  it("upsertTemplate updates an existing template in place", () => {
    const before = useNotificationStore.getState().templates.length;
    useNotificationStore.getState().upsertTemplate({ ...draft, code: "AUTH_OTP", en: "changed" });
    const after = useNotificationStore.getState().templates;
    expect(after.length).toBe(before);
    expect(after.find((template) => template.code === "AUTH_OTP")?.en).toBe("changed");
  });

  it("deleteTemplate removes by code", () => {
    useNotificationStore.getState().deleteTemplate("AUTH_OTP");
    expect(useNotificationStore.getState().templates.some((template) => template.code === "AUTH_OTP")).toBe(false);
  });

  it("setMapping and setRouting replace the row for an event", () => {
    const mapping = useNotificationStore.getState().mappings[0];
    useNotificationStore
      .getState()
      .setMapping({ ...mapping, recipients: { ...mapping.recipients, bcba: false } });
    expect(
      useNotificationStore.getState().mappings.find((x) => x.eventId === mapping.eventId)?.recipients
        .bcba,
    ).toBe(false);

    const routing = useNotificationStore.getState().routing[0];
    useNotificationStore.getState().setRouting({ ...routing, urgency: "low" });
    const updated = useNotificationStore.getState().routing.find((x) => x.eventId === routing.eventId);
    expect(updated?.urgency).toBe("low");
  });
});
