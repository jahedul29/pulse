import type {
  AlertRouting,
  EventMapping,
  LiveAlert,
  MessageTemplate,
  NotificationLogEntry,
} from "./types";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function seedTemplates(): MessageTemplate[] {
  const now = Date.now();
  return [
    {
      code: "VAL_REQUIRED_FIELD",
      category: "validation",
      en: "This field is required. Please enter a value before continuing.",
      ar: "هذا الحقل مطلوب. يرجى إدخال قيمة قبل المتابعة.",
      updatedAt: now - 2 * DAY,
    },
    {
      code: "VAL_INVALID_DATE",
      category: "validation",
      en: "The date you entered is not valid. Use the dd-Mmm-yyyy format.",
      ar: "التاريخ الذي أدخلته غير صالح. استخدم صيغة dd-Mmm-yyyy.",
      updatedAt: now - 6 * DAY,
    },
    {
      code: "EDR_SESSION_MISSED",
      category: "edr",
      en: "A scheduled session was missed. The care team has been notified.",
      ar: "تم تفويت جلسة مجدولة. تم إخطار فريق الرعاية.",
      updatedAt: now - 5 * HOUR,
    },
    {
      code: "EDR_PLAN_UPDATED",
      category: "edr",
      en: "The treatment plan was updated. Please review the latest goals.",
      ar: "تم تحديث خطة العلاج. يرجى مراجعة الأهداف الأحدث.",
      updatedAt: now - 30 * HOUR,
    },
    {
      code: "SYS_MAINTENANCE",
      category: "system",
      en: "Scheduled maintenance will begin shortly. Some features may be unavailable.",
      ar: "ستبدأ الصيانة المجدولة قريبًا. قد لا تتوفر بعض الميزات.",
      updatedAt: now - 9 * DAY,
    },
    {
      code: "AUTH_OTP",
      category: "auth",
      en: "Your one-time verification code is {code}. It expires in 5 minutes.",
      ar: "رمز التحقق لمرة واحدة هو {code}. تنتهي صلاحيته خلال 5 دقائق.",
      updatedAt: now - 20 * MIN,
    },
    {
      code: "AUTH_PASSWORD_RESET",
      category: "auth",
      en: "We received a request to reset your password. Follow the link to continue.",
      ar: "تلقينا طلبًا لإعادة تعيين كلمة المرور. اتبع الرابط للمتابعة.",
      updatedAt: now - 3 * DAY,
    },
  ];
}

export function seedMappings(): EventMapping[] {
  return [
    {
      eventId: "ev_session_missed",
      eventName: "Session missed",
      recipients: { client: true, rbt: true, sltot: true, bcba: true },
      templateByRole: {
        client: "EDR_SESSION_MISSED",
        rbt: "EDR_SESSION_MISSED",
        sltot: "EDR_SESSION_MISSED",
        bcba: "EDR_SESSION_MISSED",
      },
    },
    {
      eventId: "ev_session_rescheduled",
      eventName: "Session rescheduled",
      recipients: { client: true, rbt: true, sltot: false, bcba: false },
      templateByRole: { client: "EDR_SESSION_MISSED", rbt: "EDR_SESSION_MISSED" },
    },
    {
      eventId: "ev_payment_failed",
      eventName: "Payment failed",
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
      templateByRole: { client: "VAL_REQUIRED_FIELD" },
    },
    {
      eventId: "ev_report_ready",
      eventName: "Assessment report ready",
      recipients: { client: true, rbt: false, sltot: false, bcba: true },
      templateByRole: { client: "EDR_PLAN_UPDATED", bcba: "EDR_PLAN_UPDATED" },
    },
    {
      eventId: "ev_plan_updated",
      eventName: "Treatment plan updated",
      recipients: { client: true, rbt: true, sltot: true, bcba: true },
      templateByRole: {
        client: "EDR_PLAN_UPDATED",
        rbt: "EDR_PLAN_UPDATED",
        sltot: "EDR_PLAN_UPDATED",
        bcba: "EDR_PLAN_UPDATED",
      },
    },
    {
      eventId: "ev_account_locked",
      eventName: "Account locked",
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
      templateByRole: { client: "AUTH_PASSWORD_RESET" },
    },
    {
      eventId: "ev_new_message",
      eventName: "New message received",
      recipients: { client: true, rbt: true, sltot: true, bcba: false },
      templateByRole: {},
    },
    {
      eventId: "ev_invoice_due",
      eventName: "Invoice due",
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
      templateByRole: { client: "SYS_MAINTENANCE" },
    },
  ];
}

export function seedRouting(): AlertRouting[] {
  return [
    {
      eventId: "ev_session_missed",
      eventName: "Session missed",
      recipients: { client: true, rbt: true, sltot: true, bcba: true },
      generatesTicket: true,
      urgency: "high",
    },
    {
      eventId: "ev_session_rescheduled",
      eventName: "Session rescheduled",
      recipients: { client: true, rbt: true, sltot: false, bcba: false },
      generatesTicket: false,
      urgency: "low",
    },
    {
      eventId: "ev_payment_failed",
      eventName: "Payment failed",
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
      generatesTicket: true,
      urgency: "high",
    },
    {
      eventId: "ev_report_ready",
      eventName: "Assessment report ready",
      recipients: { client: true, rbt: false, sltot: false, bcba: true },
      generatesTicket: false,
      urgency: "low",
    },
    {
      eventId: "ev_plan_updated",
      eventName: "Treatment plan updated",
      recipients: { client: true, rbt: true, sltot: true, bcba: true },
      generatesTicket: false,
      urgency: "medium",
    },
    {
      eventId: "ev_account_locked",
      eventName: "Account locked",
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
      generatesTicket: true,
      urgency: "high",
    },
    {
      eventId: "ev_new_message",
      eventName: "New message received",
      recipients: { client: true, rbt: true, sltot: true, bcba: false },
      generatesTicket: false,
      urgency: "low",
    },
    {
      eventId: "ev_invoice_due",
      eventName: "Invoice due",
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
      generatesTicket: false,
      urgency: "medium",
    },
  ];
}

export function seedLog(): NotificationLogEntry[] {
  const now = Date.now();
  return [
    { id: "N-1", createdAt: now - 4 * MIN, recipientName: "Layla Haddad", recipientRole: "client", category: "edr", templateCode: "EDR_SESSION_MISSED", status: "delivered" },
    { id: "N-2", createdAt: now - 12 * MIN, recipientName: "Alex Rivera", recipientRole: "rbt", category: "edr", templateCode: "EDR_SESSION_MISSED", status: "delivered" },
    { id: "N-3", createdAt: now - 28 * MIN, recipientName: "Priya Nair", recipientRole: "bcba", category: "edr", templateCode: "EDR_PLAN_UPDATED", status: "pending" },
    { id: "N-4", createdAt: now - 55 * MIN, recipientName: "Omar Farouk", recipientRole: "client", category: "auth", templateCode: "AUTH_OTP", status: "delivered" },
    { id: "N-5", createdAt: now - 2 * HOUR, recipientName: "Layla Haddad", recipientRole: "client", category: "validation", templateCode: "VAL_REQUIRED_FIELD", status: "failed" },
    { id: "N-6", createdAt: now - 3 * HOUR, recipientName: "Yousef Karam", recipientRole: "sltot", category: "edr", templateCode: "EDR_PLAN_UPDATED", status: "delivered" },
    { id: "N-7", createdAt: now - 5 * HOUR, recipientName: "Omar Farouk", recipientRole: "client", category: "system", templateCode: "SYS_MAINTENANCE", status: "delivered" },
    { id: "N-8", createdAt: now - 9 * HOUR, recipientName: "Alex Rivera", recipientRole: "rbt", category: "edr", templateCode: "EDR_PLAN_UPDATED", status: "delivered" },
    { id: "N-9", createdAt: now - 26 * HOUR, recipientName: "Sara Mansour", recipientRole: "client", category: "auth", templateCode: "AUTH_PASSWORD_RESET", status: "failed" },
    { id: "N-10", createdAt: now - 30 * HOUR, recipientName: "Priya Nair", recipientRole: "bcba", category: "edr", templateCode: "EDR_SESSION_MISSED", status: "delivered" },
    { id: "N-11", createdAt: now - 2 * DAY, recipientName: "Layla Haddad", recipientRole: "client", category: "validation", templateCode: "VAL_INVALID_DATE", status: "delivered" },
    { id: "N-12", createdAt: now - 3 * DAY, recipientName: "Yousef Karam", recipientRole: "sltot", category: "system", templateCode: "SYS_MAINTENANCE", status: "delivered" },
    { id: "N-13", createdAt: now - 4 * DAY, recipientName: "Omar Farouk", recipientRole: "client", category: "auth", templateCode: "AUTH_OTP", status: "pending" },
    { id: "N-14", createdAt: now - 6 * DAY, recipientName: "Sara Mansour", recipientRole: "client", category: "edr", templateCode: "EDR_SESSION_MISSED", status: "delivered" },
  ];
}

export function seedLiveAlerts(): LiveAlert[] {
  const now = Date.now();
  return [
    { id: "L-1", eventId: "ev_session_missed", eventName: "Session missed", severity: "high", firedAt: now - 2 * MIN, summary: "Layla Haddad missed a 10:00 ABA session with Alex Rivera." },
    { id: "L-2", eventId: "ev_payment_failed", eventName: "Payment failed", severity: "high", firedAt: now - 18 * MIN, summary: "Card charge for invoice inv_4821 was declined (insufficient funds)." },
    { id: "L-3", eventId: "ev_plan_updated", eventName: "Treatment plan updated", severity: "medium", firedAt: now - 47 * MIN, summary: "BCBA Priya Nair revised goals on the plan for Omar Farouk." },
    { id: "L-4", eventId: "ev_invoice_due", eventName: "Invoice due", severity: "medium", firedAt: now - 3 * HOUR, summary: "Invoice inv_4790 for Sara Mansour is due in 24 hours." },
    { id: "L-5", eventId: "ev_new_message", eventName: "New message received", severity: "low", firedAt: now - 5 * HOUR, summary: "Yousef Karam sent a message to the back-office team." },
  ];
}
