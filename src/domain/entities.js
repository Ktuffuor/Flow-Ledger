export const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", budget: 1200 },
  { name: "Transport", budget: 600 },
  { name: "Utilities & Data", budget: 400 },
  { name: "Housing & Rent", budget: 1500 },
  { name: "Health", budget: 300 },
  { name: "Shopping", budget: 500 },
  { name: "Savings & Investments", budget: 1000 },
  { name: "Salary / Income", budget: 0 },
  { name: "Other", budget: 300 }
];

export function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split("T")[0];
}

export function currentMonthISO() {
  return todayISO().slice(0, 7);
}

export function createTransaction({ amount, type, category, date, paymentMethod, note, createdAt }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  return {
    amount: Number(numericAmount.toFixed(2)),
    type: type === "income" ? "income" : "expense",
    category: String(category || "Other").trim(),
    date: String(date || todayISO()),
    paymentMethod: String(paymentMethod || "Cash").trim(),
    note: String(note || "").trim().slice(0, 80),
    createdAt: createdAt || new Date().toISOString()
  };
}

export function formatCurrency(amount, currency = "GHS") {
  const num = Number(amount || 0);
  return `${currency} ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}