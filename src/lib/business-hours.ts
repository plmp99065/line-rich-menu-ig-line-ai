export type BusinessHours = {
  enabled: boolean;
  message: string;
  days: { open: boolean; start: string; end: string }[];
};

export const defaultBusinessHours: BusinessHours = {
  enabled: false,
  message: "您好，目前是休息時間，您的訊息已收到，我們會於營業時間依序回覆，謝謝您的耐心等候！",
  days: Array.from({ length: 7 }, () => ({ open: true, start: "10:00", end: "20:00" })),
};

export function validBusinessHours(value: unknown): value is BusinessHours {
  const s = value as BusinessHours | null;
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return Boolean(s && typeof s.enabled === "boolean" && typeof s.message === "string" && s.message.trim().length > 0 && s.message.length <= 1000 && Array.isArray(s.days) && s.days.length === 7 && s.days.every(d => d && typeof d.open === "boolean" && time.test(d.start) && time.test(d.end) && (!d.open || d.start !== d.end)));
}

// Days use Sunday=0. An overnight interval also covers the next morning.
export function isBusinessOpen(settings: BusinessHours, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  const minute = Number(part("hour")) * 60 + Number(part("minute"));
  const toMinute = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const today = settings.days[day];
  const yesterday = settings.days[(day + 6) % 7];
  const start = toMinute(today.start), end = toMinute(today.end);
  return (today.open && (start < end ? minute >= start && minute < end : minute >= start)) ||
    (yesterday.open && toMinute(yesterday.start) > toMinute(yesterday.end) && minute < toMinute(yesterday.end));
}
