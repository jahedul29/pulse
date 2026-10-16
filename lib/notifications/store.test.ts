import { useNotificationStore } from "./store";
import { seedMappings, seedTemplates } from "./mock";

beforeEach(() => {
  useNotificationStore.setState({
    templates: seedTemplates(),
    mappings: seedMappings(),
  });
});

describe("useNotificationStore", () => {
  it("setMapping replaces the row for an event", () => {
    const mapping = useNotificationStore.getState().mappings[0];
    useNotificationStore
      .getState()
      .setMapping({ ...mapping, recipients: { ...mapping.recipients, bcba: false } });
    expect(
      useNotificationStore.getState().mappings.find((row) => row.eventId === mapping.eventId)?.recipients.bcba,
    ).toBe(false);
  });
});
