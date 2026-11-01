import { balance, Database, Payment } from "./model";
/** Allocate in selected order; caller must commit the database atomically. */
export function settlePayment(db: Database, payment: Payment) {
  let remaining = payment.amount;
  for (const id of payment.invoiceIds) {
    const invoice = db.invoices.find(
      (i) => i.schoolId === payment.schoolId && i.id === id,
    );
    if (!invoice) throw new Error("Invoice is unavailable.");
    const allocation = Math.min(balance(invoice), remaining);
    invoice.paid += allocation;
    remaining -= allocation;
  }
  if (remaining) throw new Error("Balances changed. Review the payment again.");
  payment.state = "settled";
}

/** Parse user-entered naira without rounding sub-kobo values. */
export function parseNaira(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}
