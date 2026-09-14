import { useEffect, useState } from "react";
import { alarmPrefEnabled, getAlarmState, startPassiveWatch, subscribeAlarm, type AlarmState } from "./alarmEngine";

/** Alarm motoru durumunu React'e bağlar; mod kapalıysa pasif izleme (açıkken zil) */
export function useAlarm(): AlarmState & { prefWanted: boolean } {
  const [s, setS] = useState<AlarmState>(getAlarmState);
  useEffect(() => { startPassiveWatch(); return subscribeAlarm(setS); }, []);
  return { ...s, prefWanted: alarmPrefEnabled() };
}
