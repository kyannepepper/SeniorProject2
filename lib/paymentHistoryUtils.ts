/** Compare calendar dates as YYYY-MM-DD (avoids UTC shift on date-only strings). */
export function parseLocalYmd(iso: string): string {
  if (!iso) return "";
  const d = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}`;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if paid on or before the due date (same calendar day counts as on time). */
export function isPaidOnTime(dateDue: string, datePaid: string): boolean {
  const due = parseLocalYmd(dateDue);
  const paid = parseLocalYmd(datePaid);
  if (!due || !paid) return true;
  return paid <= due;
}

export type PaidPaymentRow = {
  payment_id: string;
  amount_due: number;
  late_fee: number;
  date_due: string;
  date_paid: string;
};

/** Full payment row (paid or unpaid) for landlord late-fee targeting */
export type PaymentRow = {
  payment_id: string;
  amount_due: number;
  late_fee: number;
  date_due: string;
  date_paid: string | null;
};

export function isPaidLate(dateDue: string, datePaid: string): boolean {
  return !isPaidOnTime(dateDue, datePaid);
}

export function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Unpaid and past due date, or paid after the due date. */
export function isPaymentLateStatus(row: PaymentRow): boolean {
  const today = todayYmd();
  if (!row.date_paid) {
    return row.date_due < today;
  }
  return isPaidLate(row.date_due, row.date_paid);
}

/**
 * Where the landlord should apply a late fee:
 * - Overdue unpaid: earliest unpaid with due date before today
 * - Else: most recent paid-late payment → add fee to the next unpaid period after it
 */
export function computeLateFeeTarget(
  payments: PaymentRow[]
): { paymentId: string; mode: "overdue_unpaid" | "paid_late_next"; detail: string } | null {
  if (!payments.length) return null;
  const sorted = [...payments].sort((a, b) => a.date_due.localeCompare(b.date_due));
  const today = todayYmd();
  const unpaid = sorted.filter((p) => !p.date_paid);

  const overdueUnpaid = unpaid.find((p) => p.date_due < today);
  if (overdueUnpaid) {
    return {
      paymentId: overdueUnpaid.payment_id,
      mode: "overdue_unpaid",
      detail: `Rent due ${overdueUnpaid.date_due} is unpaid and past the due date.`,
    };
  }

  const paid = sorted.filter((p) => p.date_paid);
  const paidByPaidDateDesc = [...paid].sort(
    (a, b) => new Date(b.date_paid!).getTime() - new Date(a.date_paid!).getTime()
  );
  for (const p of paidByPaidDateDesc) {
    if (!p.date_paid) continue;
    if (isPaidLate(p.date_due, p.date_paid)) {
      const nextUnpaid = unpaid.find((u) => u.date_due > p.date_due);
      if (nextUnpaid) {
        return {
          paymentId: nextUnpaid.payment_id,
          mode: "paid_late_next",
          detail: `Payment due ${p.date_due} was paid late. Late fee applies to the next unpaid period (due ${nextUnpaid.date_due}).`,
        };
      }
    }
  }

  return null;
}
