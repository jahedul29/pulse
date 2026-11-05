import type { NotificationTemplateDto } from "./dto";
import {
  EMPTY_TEMPLATE_FORM,
  isLegacyTemplate,
  templateCreateBody,
  templateToForm,
  templateType,
  templateUpdateBody,
} from "./templates";

const notification: NotificationTemplateDto = {
  id: 31,
  code: "BCBA_MSG39_8",
  name: "Account blocked",
  type: "NOTIFICATION",
  channel_id: 1,
  icon: "user_blocked",
  sender_name: "ABAPRO",
  header_title: { EN: "Account blocked", AR: "تم حظر الحساب" },
  header_subtitle: { EN: "Your account has been blocked" },
  subject: { EN: "Your account has been blocked", AR: "تم حظر حسابك" },
  body: { EN: '<p>Hello {first_name},</p><p>Open <a class="highlight" data-action="open_account_status">status</a></p>' },
  button_label: { EN: "OK", AR: "حسناً" },
  is_active: true,
};

describe("templateType", () => {
  it("treats anything but POPUP as a notification", () => {
    expect(templateType({ type: "POPUP" })).toBe("POPUP");
    expect(templateType({ type: "NOTIFICATION" })).toBe("NOTIFICATION");
    expect(templateType({ type: null })).toBe("NOTIFICATION");
  });
});

describe("templateToForm / templateUpdateBody", () => {
  it("round-trips every field of a notification", () => {
    const body = templateUpdateBody(templateToForm(notification));
    expect(body).toEqual({
      name: "Account blocked",
      type: "NOTIFICATION",
      channel_id: 1,
      icon: "user_blocked",
      sender_name: "ABAPRO",
      header_title: { EN: "Account blocked", AR: "تم حظر الحساب" },
      header_subtitle: { EN: "Your account has been blocked" },
      subject: { EN: "Your account has been blocked", AR: "تم حظر حسابك" },
      body: notification.body,
      button_label: { EN: "OK", AR: "حسناً" },
      is_active: true,
    });
  });

  it("sends null for every header field of a popup, even when the form still holds values", () => {
    const body = templateUpdateBody({ ...templateToForm(notification), type: "POPUP" });
    expect(body).toMatchObject({
      type: "POPUP",
      icon: null,
      sender_name: null,
      header_title: null,
      header_subtitle: null,
      subject: null,
      button_label: { EN: "OK", AR: "حسناً" },
    });
  });

  it("sends null for empty optional text and leaves out an empty Arabic body", () => {
    const body = templateUpdateBody({
      ...EMPTY_TEMPLATE_FORM,
      name: "Notice",
      channelId: "2",
      headerTitleEn: "Title",
      senderName: "  ",
      bodyEn: "<p>Hi</p>",
      bodyAr: "<p></p>",
    });
    expect(body).toMatchObject({
      icon: null,
      sender_name: null,
      header_subtitle: null,
      subject: null,
      body: { EN: "<p>Hi</p>" },
      channel_id: 2,
    });
  });

  it("adds the code only when creating", () => {
    const values = { ...templateToForm(notification), code: "NEW_CODE" };
    expect(templateCreateBody(values).code).toBe("NEW_CODE");
    expect("code" in templateUpdateBody(values)).toBe(false);
  });
});

describe("EMPTY_TEMPLATE_FORM", () => {
  it("starts as a notification from ABAPRO with an OK button", () => {
    expect(EMPTY_TEMPLATE_FORM).toMatchObject({
      type: "NOTIFICATION",
      senderName: "ABAPRO",
      buttonLabelEn: "OK",
      buttonLabelAr: "حسناً",
    });
  });
});

describe("older templates", () => {
  const legacy: NotificationTemplateDto = {
    id: 1,
    code: "SEED_WELCOME",
    name: "Welcome admins",
    type: "NOTIFICATION",
    channel_id: 1,
    icon: null,
    sender_name: null,
    header_title: null,
    header_subtitle: null,
    subject: { EN: "Welcome" },
    body: { EN: "Your account is active.\nReview your modules." },
    button_label: null,
    is_active: true,
  };

  it("are recognised by their missing bar title", () => {
    expect(isLegacyTemplate(legacy)).toBe(true);
    expect(isLegacyTemplate(notification)).toBe(false);
    expect(isLegacyTemplate({ ...legacy, type: "POPUP" })).toBe(false);
  });

  it("open with the default sender and button label, and a plain-text body split into paragraphs", () => {
    expect(templateToForm(legacy)).toMatchObject({
      senderName: "ABAPRO",
      buttonLabelEn: "OK",
      buttonLabelAr: "حسناً",
      bodyEn: "<p>Your account is active.</p><p>Review your modules.</p>",
    });
  });
});

describe("saved body HTML", () => {
  it("keeps only paragraphs, highlights and the known action links", () => {
    const body = templateUpdateBody({
      ...templateToForm(notification),
      bodyEn:
        '<p style="text-align: center"><strong>Bold</strong> <em>it</em> <u>u</u> <span class="highlight">hi</span> <a class="highlight" data-action="verify_email">ok</a> <a class="highlight" data-action="delete_account">bad</a></p>',
    }).body.EN;
    expect(body).toBe(
      '<p>Bold it u <span class="highlight">hi</span> <a class="highlight" data-action="verify_email">ok</a> bad</p>',
    );
  });
});
