import type { Reminder } from "../../db/types";

/** A matching local reminder still needs a server message once push is enabled. */
export function needsReminderScheduling(
  current: Pick<Reminder, "at" | "msgId"> | undefined,
  desiredAt: number,
  hasSubscription: boolean,
): boolean {
  return !current || !(Math.abs(current.at - desiredAt) <= 60_000)
    || (hasSubscription && !current.msgId);
}
