import type { EventMapping, MessageTemplate } from "./types";

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
