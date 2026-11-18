export function filterTransactionsByMonth(transactions, monthISO) {
  return transactions.filter((t) => (t.date || "").startsWith(monthISO));
}

export function calculateKPIs(monthTransactions) {
  let income = 0;
  let expense = 0;

  for (const tx of monthTransactions) {
    const amt = Number(tx.amount || 0);
    if (tx.type === "income") income += amt;
    else expense += amt;
  }

  const balance = income - expense;
  const savingsRate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;

  return { income, expense, balance, savingsRate };
}

export function calculateBudgetProgress(monthTransactions, categories) {
  const spendByCat = {};
  for (const tx of monthTransactions) {
    if (tx.type === "expense") {
      spendByCat[tx.category] = (spendByCat[tx.category] || 0) + Number(tx.amount || 0);
    }
  }

  return categories
    .filter((c) => Number(c.budget) > 0)
    .map((cat) => {
      const spent = spendByCat[cat.name] || 0;
      const limit = Number(cat.budget);
      const rawPct = (spent / limit) * 100;
      const clampedPct = Math.min(100, rawPct);

      let status = "healthy";
      if (rawPct >= 100) status = "exceeded";
      else if (rawPct >= 75) status = "warning";

      return { name: cat.name, spent, limit, rawPct, clampedPct, status };
    });
}

export function aggregateExpensesByCategory(monthTransactions) {
  const totals = {};
  let totalExpense = 0;

  for (const tx of monthTransactions) {
    if (tx.type === "expense") {
      const amt = Number(tx.amount || 0);
      totals[tx.category] = (totals[tx.category] || 0) + amt;
      totalExpense += amt;
    }
  }

  const breakdown = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }));

  return { totalExpense, breakdown };
}

export function aggregateDailyExpenses(monthTransactions, monthISO) {
  const [year, month] = monthISO.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = Array(daysInMonth).fill(0);

  for (const tx of monthTransactions) {
    if (tx.type === "expense") {
      const day = Number((tx.date || "").split("-")[2]);
      if (day >= 1 && day <= daysInMonth) {
        daily[day - 1] += Number(tx.amount || 0);
      }
    }
  }

  return { daysInMonth, daily, maxDaily: Math.max(...daily, 0) };
}