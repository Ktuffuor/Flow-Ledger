import { DEFAULT_CATEGORIES } from "../domain/entities.js";

const TX_KEY = "fl_transactions";
const PREFS_KEY = "fl_prefs";

export class LocalStorageRepository {
  constructor() {
    this.listeners = new Set();
  }

  readAll() {
    let transactions = [];
    let categories = structuredClone(DEFAULT_CATEGORIES);
    let currency = "GHS";

    try {
      const rawTx = localStorage.getItem(TX_KEY);
      const rawPrefs = localStorage.getItem(PREFS_KEY);
      if (rawTx) transactions = JSON.parse(rawTx);
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs);
        if (prefs.categories?.length) categories = prefs.categories;
        if (prefs.currency) currency = prefs.currency;
      }
    } catch (err) {
      console.error("LocalStorage read error:", err);
    }

    return { transactions, categories, currency };
  }

  emit() {
    const snapshot = this.readAll();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  subscribe(onData) {
    this.listeners.add(onData);
    onData(this.readAll());
    return () => this.listeners.delete(onData);
  }

  async addTransaction(tx) {
    const data = this.readAll();
    tx.id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    data.transactions.unshift(tx);
    localStorage.setItem(TX_KEY, JSON.stringify(data.transactions));
    this.emit();
  }

  async deleteTransaction(id) {
    const data = this.readAll();
    const filtered = data.transactions.filter((t) => t.id !== id);
    localStorage.setItem(TX_KEY, JSON.stringify(filtered));
    this.emit();
  }

  async savePreferences({ categories, currency }) {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ categories, currency }));
    this.emit();
  }

  async importBackup({ transactions, categories, currency }) {
    const current = this.readAll();
    const withIds = transactions.map((t, i) => ({
      ...t,
      id: t.id || `local_${Date.now()}_${i}`
    }));
    localStorage.setItem(TX_KEY, JSON.stringify(withIds));
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        categories: categories || current.categories,
        currency: currency || current.currency
      })
    );
    this.emit();
  }
}