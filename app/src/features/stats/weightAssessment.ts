/** null: doğum kilosu dalı uygulanmaz; ölçümler arası g/gün değerlendirilir. */
export function weightAssessment(birthG: number | undefined, lastG: number, lastAge: number): { status: "iyi" | "izle" | "dikkat"; note: string } | null {
  if (!birthG || (lastAge > 14 && lastG >= birthG)) return null;
  const loss = (birthG - lastG) / birthG;
  if (loss > 0.10) return { status: "dikkat", note: "doğum kilosunun %10'undan fazla kayıp — hekime bugün söyle (beslenme değerlendirmesi)" };
  if (lastAge >= 14 && loss > 0) return { status: "dikkat", note: `${lastAge}. günde hâlâ doğum kilosunun altında — hekime söyle` };
  if (loss > 0.07) return { status: "izle", note: "%7-10 kayıp sınırda; 10-14. günde doğum kilosuna dönmeli" };
  return { status: "iyi", note: "ilk günlerde %7'ye kadar kayıp normal; doğum kilosuna dönüş 10-14. günde" };
}
