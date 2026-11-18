import { createTransaction, todayISO } from "../domain/entities.js";

export class BackupUseCases {
  constructor(expenseUseCases) {
    this.expenseUseCases = expenseUseCases;
  }

  generateCSV() {
    const { transactions, currency } = this.expenseUseCases.state;
    const headers = ["Date", "Type", "Category", "PaymentMethod", "Amount", "Currency", "Note"];
    const rows = transactions.map((t) =>
      [
        t.date,
        t.type,
        `"${(t.category || "").replace(/"/g, '""')}"`,
        `"${(t.paymentMethod || "").replace(/"/g, '""')}"`,
        t.amount,
        currency,
        `"${(t.note || "").replace(/"/g, '""')}"`
      ].join(",")
    );
    return {
      filename: `flowledger_${todayISO()}.csv`,
      content: [headers.join(","), ...rows].join("\n"),
      mime: "text/csv"
    };
  }

  generateJSON() {
    const { transactions, categories, currency } = this.expenseUseCases.state;
    const payload = {
      exportedAt: new Date().toISOString(),
      currency,
      categories,
      transactions
    };
    return {
      filename: `flowledger_backup_${todayISO()}.json`,
      content: JSON.stringify(payload, null, 2),
      mime: "application/json"
    };
  }

  parseBackupJSON(rawText) {
    const data = JSON.parse(rawText);
    if (!Array.isArray(data.transactions)) {
      throw new Error("Invalid backup file: missing transactions array.");
    }
    const sanitizedTransactions = data.transactions.map((t) => createTransaction(t));
    return {
      transactions: sanitizedTransactions,
      categories: Array.isArray(data.categories) ? data.categories : null,
      currency: typeof data.currency === "string" ? data.currency : null
    };
  }

  async restoreBackup(parsedData) {
    await this.expenseUseCases.repository.importBackup(parsedData);
  }
}