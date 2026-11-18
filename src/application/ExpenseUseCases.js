import { createTransaction, DEFAULT_CATEGORIES } from "../domain/entities.js";

export class ExpenseUseCases {
  constructor(repository) {
    this.repository = repository;
    this.state = {
      transactions: [],
      categories: structuredClone(DEFAULT_CATEGORIES),
      currency: "GHS"
    };
    this.listeners = new Set();
  }

  setRepository(newRepository) {
    if (this.unsubscribeRepo) this.unsubscribeRepo();
    this.repository = newRepository;
    this.start();
  }

  start() {
    this.unsubscribeRepo = this.repository.subscribe((data) => {
      this.state.transactions = data.transactions || [];
      if (data.categories?.length) this.state.categories = data.categories;
      if (data.currency) this.state.currency = data.currency;
      this.notify();
    });
  }

  onChange(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  async addTransaction(rawInput) {
    const tx = createTransaction(rawInput);
    await this.repository.addTransaction(tx);
  }

  async deleteTransaction(id) {
    await this.repository.deleteTransaction(id);
  }

  async updateCurrency(currency) {
    this.state.currency = currency;
    await this.repository.savePreferences({
      categories: this.state.categories,
      currency: this.state.currency
    });
  }

  async updateCategories(categories) {
    if (!categories.length) return;
    this.state.categories = categories;
    await this.repository.savePreferences({
      categories: this.state.categories,
      currency: this.state.currency
    });
  }
}