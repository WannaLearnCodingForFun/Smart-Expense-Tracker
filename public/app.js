/**
 * Smart Expense Tracker - Frontend Application
 * Vanilla JavaScript - No frameworks
 */

// ============ Configuration ============
const API_BASE = '/api/expenses';

// Chart.js color palette
const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16'
];

// ============ State ============
let pieChart = null;
let barChart = null;

// ============ DOM Elements ============
const elements = {
  totalExpenses: document.getElementById('totalExpenses'),
  monthlyExpenses: document.getElementById('monthlyExpenses'),
  budgetDisplay: document.getElementById('budgetDisplay'),
  budgetWarning: document.getElementById('budgetWarning'),
  monthlyBudget: document.getElementById('monthlyBudget'),
  saveBudget: document.getElementById('saveBudget'),
  expenseForm: document.getElementById('expenseForm'),
  expenseId: document.getElementById('expenseId'),
  formTitle: document.getElementById('formTitle'),
  amount: document.getElementById('amount'),
  category: document.getElementById('category'),
  description: document.getElementById('description'),
  date: document.getElementById('date'),
  submitBtn: document.getElementById('submitBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  amountError: document.getElementById('amountError'),
  filterCategory: document.getElementById('filterCategory'),
  filterStartDate: document.getElementById('filterStartDate'),
  filterEndDate: document.getElementById('filterEndDate'),
  applyFilters: document.getElementById('applyFilters'),
  clearFilters: document.getElementById('clearFilters'),
  expensesTableBody: document.getElementById('expensesTableBody'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  emptyState: document.getElementById('emptyState'),
  tableWrapper: document.getElementById('tableWrapper'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.querySelector('.theme-icon'),
  exportCsv: document.getElementById('exportCsv'),
  toastContainer: document.getElementById('toastContainer')
};

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  setDefaultDate();
  loadBudget();
  initCharts();
  loadExpenses();
  loadStats();
  setupEventListeners();
});

// ============ API Functions ============

async function fetchExpenses(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const url = params ? `${API_BASE}?${params}` : API_BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

async function fetchStats(month, year) {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (year) params.append('year', year);
  const url = params.toString() ? `${API_BASE}/stats?${params}` : `${API_BASE}/stats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function createExpense(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.details || result.error || 'Failed to create');
  return result;
}

async function updateExpense(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.details || result.error || 'Failed to update');
  return result;
}

async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete');
  return result;
}

// ============ Data Loading ============

async function loadExpenses() {
  showLoading(true);
  try {
    const filters = getActiveFilters();
    const expenses = await fetchExpenses(filters);
    renderExpensesTable(expenses);
  } catch (err) {
    showToast('Failed to load expenses: ' + err.message, 'error');
    renderExpensesTable([]);
  } finally {
    showLoading(false);
  }
}

async function loadStats() {
  try {
    const now = new Date();
    const stats = await fetchStats(now.getMonth() + 1, now.getFullYear());

    // Update total (all-time)
    elements.totalExpenses.textContent = formatCurrency(stats.totalExpenses);

    // Monthly total (current month)
    const monthlyTotal = stats.monthlyTotal || 0;
    elements.monthlyExpenses.textContent = formatCurrency(monthlyTotal);

    // Update charts
    updatePieChart(stats.categoryData);
    updateBarChart(stats.monthlyData);

    // Budget warning
    checkBudgetWarning(monthlyTotal);
  } catch (err) {
    console.error('Stats load error:', err);
    elements.totalExpenses.textContent = '$0.00';
    elements.monthlyExpenses.textContent = '$0.00';
  }
}

// ============ Table Rendering ============

function renderExpensesTable(expenses) {
  elements.expensesTableBody.innerHTML = '';

  if (expenses.length === 0) {
    elements.emptyState.classList.remove('hidden');
    elements.tableWrapper.classList.add('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.tableWrapper.classList.remove('hidden');

  expenses.forEach(expense => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(expense.date)}</td>
      <td class="amount-cell">${formatCurrency(expense.amount)}</td>
      <td><span class="category-badge">${expense.category}</span></td>
      <td>${expense.description || '-'}</td>
      <td class="actions-cell">
        <button class="btn btn-edit edit-btn" data-id="${expense._id}">Edit</button>
        <button class="btn btn-danger delete-btn" data-id="${expense._id}">Delete</button>
      </td>
    `;
    elements.expensesTableBody.appendChild(row);
  });

  // Attach event listeners
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => handleEdit(btn.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

// ============ Form Handling ============

function setupEventListeners() {
  elements.expenseForm.addEventListener('submit', handleFormSubmit);
  elements.cancelBtn.addEventListener('click', resetForm);
  elements.applyFilters.addEventListener('click', loadExpenses);
  elements.clearFilters.addEventListener('click', clearFilters);
  elements.saveBudget.addEventListener('click', saveBudget);
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.exportCsv.addEventListener('click', exportToCsv);
}

function handleFormSubmit(e) {
  e.preventDefault();
  clearValidationErrors();

  const amount = parseFloat(elements.amount.value);
  if (isNaN(amount) || amount <= 0) {
    elements.amount.classList.add('error');
    elements.amountError.textContent = 'Please enter a valid amount';
    return;
  }

  const data = {
    amount,
    category: elements.category.value,
    description: elements.description.value.trim(),
    date: elements.date.value || new Date().toISOString().split('T')[0]
  };

  const id = elements.expenseId.value;
  const isEdit = !!id;

  (isEdit ? updateExpense(id, data) : createExpense(data))
    .then(() => {
      showToast(isEdit ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
      resetForm();
      loadExpenses();
      loadStats();
    })
    .catch(err => {
      showToast(err.message, 'error');
    });
}

async function handleEdit(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    const expense = await res.json();
    if (!res.ok) throw new Error(expense.error || 'Not found');

    elements.expenseId.value = expense._id;
    elements.amount.value = expense.amount;
    elements.category.value = expense.category;
    elements.description.value = expense.description || '';
    elements.date.value = expense.date.split('T')[0];
    elements.formTitle.textContent = 'Edit Expense';
    elements.submitBtn.textContent = 'Update Expense';
    elements.cancelBtn.style.display = 'inline-block';

    elements.expenseForm.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDelete(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    await deleteExpense(id);
    showToast('Expense deleted successfully!', 'success');
    loadExpenses();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function resetForm() {
  elements.expenseForm.reset();
  elements.expenseId.value = '';
  elements.formTitle.textContent = 'Add New Expense';
  elements.submitBtn.textContent = 'Add Expense';
  elements.cancelBtn.style.display = 'none';
  setDefaultDate();
  clearValidationErrors();
}

function clearValidationErrors() {
  elements.amount.classList.remove('error');
  elements.amountError.textContent = '';
}

function setDefaultDate() {
  elements.date.value = new Date().toISOString().split('T')[0];
}

// ============ Filters ============

function getActiveFilters() {
  const filters = {};
  if (elements.filterCategory.value && elements.filterCategory.value !== 'all') {
    filters.category = elements.filterCategory.value;
  }
  if (elements.filterStartDate.value) {
    filters.startDate = elements.filterStartDate.value;
  }
  if (elements.filterEndDate.value) {
    filters.endDate = elements.filterEndDate.value;
  }
  return filters;
}

function clearFilters() {
  elements.filterCategory.value = 'all';
  elements.filterStartDate.value = '';
  elements.filterEndDate.value = '';
  loadExpenses();
  showToast('Filters cleared', 'info');
}

// ============ Charts ============

function initCharts() {
  // Pie Chart
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: CHART_COLORS,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // Bar Chart
  const barCtx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Spending',
        data: [],
        backgroundColor: CHART_COLORS[0],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => '$' + value
          }
        }
      }
    }
  });
}

function updatePieChart(categoryData) {
  if (!categoryData || categoryData.length === 0) {
    pieChart.data.labels = ['No data'];
    pieChart.data.datasets[0].data = [1];
    pieChart.data.datasets[0].backgroundColor = ['#e2e8f0'];
  } else {
    pieChart.data.labels = categoryData.map(c => c._id);
    pieChart.data.datasets[0].data = categoryData.map(c => c.total);
    pieChart.data.datasets[0].backgroundColor = CHART_COLORS;
  }
  pieChart.update();
}

function updateBarChart(monthlyData) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (!monthlyData || monthlyData.length === 0) {
    barChart.data.labels = ['No data'];
    barChart.data.datasets[0].data = [0];
  } else {
    barChart.data.labels = monthlyData.map(m =>
      `${monthNames[m._id.month - 1]} ${m._id.year}`
    );
    barChart.data.datasets[0].data = monthlyData.map(m => m.total);
  }
  barChart.update();
}

// ============ Budget ============

const BUDGET_KEY = 'expense-tracker-budget';
const DEFAULT_BUDGET = 2000;

function loadBudget() {
  const saved = localStorage.getItem(BUDGET_KEY);
  const budget = saved ? parseFloat(saved) : DEFAULT_BUDGET;
  elements.monthlyBudget.value = budget;
  elements.budgetDisplay.textContent = formatCurrency(budget);
}

function saveBudget() {
  const value = parseFloat(elements.monthlyBudget.value);
  if (isNaN(value) || value < 0) {
    showToast('Please enter a valid budget amount', 'error');
    return;
  }
  localStorage.setItem(BUDGET_KEY, value.toString());
  elements.budgetDisplay.textContent = formatCurrency(value);
  showToast('Budget saved!', 'success');
  loadStats(); // Re-check warning
}

function checkBudgetWarning(monthlyTotal) {
  const budget = parseFloat(localStorage.getItem(BUDGET_KEY)) || DEFAULT_BUDGET;
  elements.budgetWarning.classList.remove('hidden');

  if (monthlyTotal >= budget) {
    elements.budgetWarning.textContent = '⚠️ Budget exceeded!';
    elements.budgetWarning.classList.remove('safe');
  } else if (monthlyTotal >= budget * 0.9) {
    elements.budgetWarning.textContent = '⚠️ Approaching budget limit (90%+)';
    elements.budgetWarning.classList.remove('safe');
  } else {
    elements.budgetWarning.textContent = '✓ Within budget';
    elements.budgetWarning.classList.add('safe');
  }
}

// ============ Theme Toggle ============

const THEME_KEY = 'expense-tracker-theme';

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
  showToast(`${next.charAt(0).toUpperCase() + next.slice(1)} mode enabled`, 'info');
}

function updateThemeIcon(theme) {
  if (elements.themeIcon) {
    elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// ============ CSV Export ============

async function exportToCsv() {
  try {
    const expenses = await fetchExpenses();
    if (expenses.length === 0) {
      showToast('No expenses to export', 'info');
      return;
    }

    const headers = ['Date', 'Amount', 'Category', 'Description'];
    const rows = expenses.map(e => [
      formatDate(e.date),
      e.amount,
      e.category,
      (e.description || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Expenses exported to CSV!', 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

// ============ Utilities ============

function formatCurrency(amount) {
  return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showLoading(show) {
  elements.loadingIndicator.classList.toggle('hidden', !show);
  if (show) {
    elements.emptyState.classList.add('hidden');
    elements.tableWrapper.classList.add('hidden');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
