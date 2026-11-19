import { currentMonthISO, formatCurrency, todayISO } from "../domain/entities.js";
import {
  aggregateDailyExpenses,
  aggregateExpensesByCategory,
  calculateBudgetProgress,
  calculateKPIs,
  filterTransactionsByMonth
} from "../domain/analytics.js";
import { ChartRenderer } from "./ChartRenderer.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class UIController {
  constructor({ expenseUseCases, backupUseCases, firebaseRepo }) {
    this.expenseUseCases = expenseUseCases;
    this.backupUseCases = backupUseCases;
    this.firebaseRepo = firebaseRepo;
    this.selectedType = "expense";
    this.draftCategories = [];
  }

  init() {
    this.el = (id) => document.getElementById(id);
    this.el("txDate").value = todayISO();
    this.el("monthFilter").value = currentMonthISO();
    this.initTheme();
    this.bindEvents();

    this.expenseUseCases.onChange((state) => this.render(state));
  }

  initTheme() {
    const saved = localStorage.getItem("fl_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    this.el("themeToggle").textContent = saved === "dark" ? "Light Mode" : "Dark Mode";
  }

  setCloudModeUI({ configured, user }) {
    if (!configured) {
      this.el("localModeBanner").classList.remove("hidden");
      this.el("syncStatus").textContent = "Local Device Mode";
      return;
    }

    this.el("authBtn").classList.remove("hidden");
    if (user) {
      this.el("authGate").classList.add("hidden");
      this.el("appContent").classList.remove("hidden");
      this.el("authBtn").textContent = "Sign Out";
      this.el("syncStatus").textContent = `Synced: ${user.email.split("@")[0]}`;
      this.el("syncStatus").classList.add("online");
    } else {
      this.el("authGate").classList.remove("hidden");
      this.el("appContent").classList.add("hidden");
      this.el("authBtn").textContent = "Sign In";
      this.el("syncStatus").textContent = "Signed Out";
      this.el("syncStatus").classList.remove("online");
    }
  }

  bindEvents() {
    this.el("btnTypeExpense").addEventListener("click", () => {
      this.selectedType = "expense";
      this.el("btnTypeExpense").className = "type-btn active-expense";
      this.el("btnTypeIncome").className = "type-btn";
    });

    this.el("btnTypeIncome").addEventListener("click", () => {
      this.selectedType = "income";
      this.el("btnTypeIncome").className = "type-btn active-income";
      this.el("btnTypeExpense").className = "type-btn";
    });

    this.el("txForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await this.expenseUseCases.addTransaction({
          amount: this.el("txAmount").value,
          type: this.selectedType,
          category: this.el("txCategory").value,
          date: this.el("txDate").value,
          paymentMethod: this.el("txMethod").value,
          note: this.el("txNote").value
        });
        this.el("txAmount").value = "";
        this.el("txNote").value = "";
      } catch (err) {
        alert(err.message);
      }
    });

    ["monthFilter", "searchInput", "filterCategory", "filterType"].forEach((id) => {
      this.el(id).addEventListener("input", () => this.render(this.expenseUseCases.state));
      this.el(id).addEventListener("change", () => this.render(this.expenseUseCases.state));
    });

    this.el("currencySelect").addEventListener("change", (e) => {
      this.expenseUseCases.updateCurrency(e.target.value);
    });

    this.el("themeToggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("fl_theme", next);
      this.el("themeToggle").textContent = next === "dark" ? "Light Mode" : "Dark Mode";
    });

    // Budget Modal
    this.el("openBudgetModalBtn").addEventListener("click", () => {
      this.draftCategories = structuredClone(this.expenseUseCases.state.categories);
      this.renderBudgetEditor();
      this.el("budgetModal").classList.add("open");
    });
    this.el("closeBudgetModalBtn").addEventListener("click", () => this.el("budgetModal").classList.remove("open"));

    this.el("addCatBtn").addEventListener("click", () => {
      const name = this.el("newCatName").value.trim();
      const budget = parseFloat(this.el("newCatBudget").value) || 0;
      if (!name) return;
      this.draftCategories.push({ name, budget });
      this.el("newCatName").value = "";
      this.el("newCatBudget").value = "";
      this.renderBudgetEditor();
    });

    this.el("saveBudgetsBtn").addEventListener("click", async () => {
      const rows = this.el("budgetEditorRows").querySelectorAll(".editor-row");
      const updated = [];
      rows.forEach((row) => {
        const name = row.querySelector(".edit-cat-name").value.trim();
        const budget = parseFloat(row.querySelector(".edit-cat-budget").value) || 0;
        if (name) updated.push({ name, budget });
      });
      await this.expenseUseCases.updateCategories(updated);
      this.el("budgetModal").classList.remove("open");
    });

    // Setup Modal
    this.el("openSetupBtn")?.addEventListener("click", () => this.el("setupModal")?.classList.add("open"));
    this.el("bannerSetupBtn")?.addEventListener("click", () => this.el("setupModal")?.classList.add("open"));
    this.el("closeSetupModalBtn")?.addEventListener("click", () => this.el("setupModal")?.classList.remove("open"));

    // Auth
    this.el("googleSignInBtn").addEventListener("click", () => this.firebaseRepo?.signInWithGoogle());
    this.el("authBtn").addEventListener("click", () => {
      if (this.firebaseRepo?.user) this.firebaseRepo.signOutUser();
      else this.firebaseRepo?.signInWithGoogle();
    });

    // Backups
    this.el("exportCsvBtn").addEventListener("click", () => this.downloadFile(this.backupUseCases.generateCSV()));
    this.el("exportJsonBtn").addEventListener("click", () => this.downloadFile(this.backupUseCases.generateJSON()));
    this.el("importJsonBtn").addEventListener("click", () => this.el("importFileInput").click());
    this.el("importFileInput").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = this.backupUseCases.parseBackupJSON(await file.text());
        if (confirm(`Restore ${parsed.transactions.length} transactions from backup?`)) {
          await this.backupUseCases.restoreBackup(parsed);
          alert("Backup restored successfully.");
        }
      } catch (err) {
        alert("Restore failed: " + err.message);
      }
      e.target.value = "";
    });
  }

  downloadFile({ filename, content, mime }) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  renderBudgetEditor() {
    const container = this.el("budgetEditorRows");
    container.innerHTML = this.draftCategories
      .map(
        (cat, idx) => `
        <div class="editor-row">
          <input type="text" class="edit-cat-name" value="${escapeHtml(cat.name)}" />
          <input type="number" class="edit-cat-budget" value="${Number(cat.budget || 0)}" min="0" step="10" />
          <button type="button" class="btn-danger" data-remove-idx="${idx}">&times;</button>
        </div>
      `
      )
      .join("");

    container.querySelectorAll("[data-remove-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.draftCategories.length > 1) {
          this.draftCategories.splice(Number(btn.dataset.removeIdx), 1);
          this.renderBudgetEditor();
        }
      });
    });
  }

  render(state) {
    const monthISO = this.el("monthFilter").value || currentMonthISO();
    const monthTx = filterTransactionsByMonth(state.transactions, monthISO);
    this.el("currencySelect").value = state.currency;

    // Dropdowns
    const currentTxCat = this.el("txCategory").value;
    const currentFilterCat = this.el("filterCategory").value;
    this.el("txCategory").innerHTML = state.categories
      .map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`)
      .join("");
    this.el("filterCategory").innerHTML =
      `<option value="ALL">All Categories</option>` +
      state.categories.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    if (state.categories.some((c) => c.name === currentTxCat)) this.el("txCategory").value = currentTxCat;
    if (currentFilterCat) this.el("filterCategory").value = currentFilterCat;

    // KPIs
    const kpis = calculateKPIs(monthTx);
    this.el("kpiIncome").textContent = formatCurrency(kpis.income, state.currency);
    this.el("kpiExpense").textContent = formatCurrency(kpis.expense, state.currency);
    this.el("kpiBalance").textContent = formatCurrency(kpis.balance, state.currency);
    this.el("kpiBalance").className = `kpi-value ${kpis.balance >= 0 ? "val-income" : "val-expense"}`;
    this.el("kpiSavings").textContent = `${kpis.savingsRate.toFixed(1)}%`;

    // Budgets
    const budgets = calculateBudgetProgress(monthTx, state.categories);
    const colorMap = { healthy: "var(--income)", warning: "var(--warning)", exceeded: "var(--expense)" };
    this.el("budgetList").innerHTML = budgets.length
      ? budgets
          .map(
            (b) => `
          <div class="budget-item">
            <div class="budget-header">
              <span>${escapeHtml(b.name)}</span>
              <span>${formatCurrency(b.spent, state.currency)} / ${formatCurrency(b.limit, state.currency)} (${b.rawPct.toFixed(0)}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${b.clampedPct}%; background:${colorMap[b.status]};"></div>
            </div>
          </div>
        `
          )
          .join("")
      : `<p class="empty-msg">No monthly limits set. Click "Edit Goals" to add targets.</p>`;

    // Charts
    ChartRenderer.renderCategoryDonut(
      this.el("categoryChartContainer"),
      aggregateExpensesByCategory(monthTx),
      state.currency
    );
    ChartRenderer.renderDailyBars(
      this.el("dailyChartContainer"),
      aggregateDailyExpenses(monthTx, monthISO),
      state.currency
    );

    // Table
    const q = this.el("searchInput").value.trim().toLowerCase();
    const catFilter = this.el("filterCategory").value;
    const typeFilter = this.el("filterType").value;

    const rows = monthTx
      .filter((t) => {
        if (catFilter !== "ALL" && t.category !== catFilter) return false;
        if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
        if (q && !`${t.category} ${t.note} ${t.paymentMethod}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const tbody = this.el("txTableBody");
    tbody.innerHTML = rows.length
      ? rows
          .map((t) => {
            const isIncome = t.type === "income";
            return `
            <tr>
              <td>${escapeHtml(t.date)}</td>
              <td><span class="badge">${escapeHtml(t.category)}</span></td>
              <td>${escapeHtml(t.note || "—")}</td>
              <td>${escapeHtml(t.paymentMethod || "—")}</td>
              <td class="${isIncome ? "val-income" : "val-expense"}" style="font-weight:700;">
                ${isIncome ? "+" : "-"}${formatCurrency(t.amount, state.currency)}
              </td>
              <td style="text-align:right;">
                <button class="btn-danger" data-del-id="${escapeHtml(t.id)}" title="Delete">&times;</button>
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="6" class="empty-msg" style="text-align:center;">No transactions match your filters.</td></tr>`;

    tbody.querySelectorAll("[data-del-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this transaction?")) {
          this.expenseUseCases.deleteTransaction(btn.dataset.delId);
        }
      });
    });
  }
}