/** Adds N working days (Mon–Fri) to a date. Mirrors public.add_working_days() in SQL
 *  — used for the "released within 3 working days" display on the owner's side. */
export function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}
