import { useEffect, useState } from "react";
import { alarmPrefEnabled, autoArmOnFirstTap, getAlarmState, startPassiveWatch, subscribeAlarm, type AlarmState } from "./alarmEngine";

/** Alarm motoru durumunu React'e bağlar; mod kapalıysa pasif izleme (açıkken zil) */
export function useAlarm(): AlarmState & { prefWanted: boolean } {
  const [s, setS] = useState<AlarmState>(getAlarmState);
  useEffect(() => { startPassiveWatch(); autoArmOnFirstTap(); return subscribeAlarm(setS); }, []);
  useEffect(() => { if (!s.armed) autoArmOnFirstTap(); }, [s.armed]);
  return { ...s, prefWanted: alarmPrefEnabled() };
}
