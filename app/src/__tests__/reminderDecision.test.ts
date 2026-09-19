import { describe, expect, it } from "vitest";
import { needsReminderScheduling } from "../features/notify/reminderDecision";

describe("reminder scheduling decision", () => {
  const at = 1_800_000_000_000;

  it("promotes an unchanged local reminder when a subscription becomes available", () => {
    expect(needsReminderScheduling(undefined, at, false)).toBe(true);
    const local = { at, msgId: "" };
    expect(needsReminderScheduling(local, at, false)).toBe(false);
    expect(needsReminderScheduling(local, at, true)).toBe(true);
    // A failed request leaves the local entry eligible for retry.
    expect(needsReminderScheduling(local, at, true)).toBe(true);
    const scheduled = { at, msgId: "server-message" };
    expect(needsReminderScheduling(scheduled, at, true)).toBe(false);
    expect(needsReminderScheduling(scheduled, at, false)).toBe(false);
  });

  it.each([false, true])("creates missing reminders (subscription: %s)", (subscribed) => {
    expect(needsReminderScheduling(undefined, at, subscribed)).toBe(true);
  });

  it.each([-60_001, -60_000, 0, 60_000, 60_001])("preserves the one-minute tolerance at offset %s", (offset) => {
    const outsideTolerance = Math.abs(offset) > 60_000;
    expect(needsReminderScheduling({ at, msgId: "server-message" }, at + offset, true)).toBe(outsideTolerance);
    expect(needsReminderScheduling({ at, msgId: "" }, at + offset, false)).toBe(outsideTolerance);
    expect(needsReminderScheduling({ at, msgId: "" }, at + offset, true)).toBe(true);
  });
});
