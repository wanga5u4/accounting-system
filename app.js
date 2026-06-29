const API_BASE = '/api';

const CATEGORIES = {
  income: ['工资', '奖金', '理财', '兼职', '其他收入'],
  expense: ['餐饮', '交通', '购物', '住房', '娱乐', '医疗', '教育', '其他支出'],
};

const TYPE_LABELS = { income: '收入', expense: '支出' };

let records = [];
let summary = { totalIncome: 0, totalExpense: 0, balance: 0 };
let editingId = null;
let deletingId = null;

const els = {
  form: document.getElementById('recordForm'),
  formTitle: document.getElementById('formTitle'),
  recordId: document.getElementById('recordId'),
  date: document.getElementById('date'),
  type: document.getElementById('type'),
  category: document.getElementById('category'),
  amount: document.getElementById('amount'),
  note: document.getElementById('note'),
  submitBtn: document.getElementById('submitBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  recordList: document.getElementById('recordList'),
  emptyTip: document.getElementById('emptyTip'),
  totalIncome: document.getElementById('totalIncome'),
  totalExpense: document.getElementById('totalExpense'),
  balance: document.getElementById('balance'),
  filterType: document.getElementById('filterType'),
  filterMonth: document.getElementById('filterMonth'),
  clearFilter: document.getElementById('clearFilter'),
  deleteModal: document.getElementById('deleteModal'),
  cancelDelete: document.getElementById('cancelDelete'),
  confirmDelete: document.getElementById('confirmDelete'),
  toast: document.getElementById('toast'),
  loadingOverlay: document.getElementById('loadingOverlay'),
};

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || '请求失败，请稍后重试');
  }

  return data;
}

function setLoading(loading) {
  els.loadingOverlay.classList.toggle('hidden', !loading);
  els.submitBtn.disabled = loading;
  els.confirmDelete.disabled = loading;
}

function showToast(message, type = 'error') {
  els.toast.textContent = message;
  els.toast.className = `toast toast-${type}`;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 3000);
}

function formatMoney(value) {
  return '¥' + Number(value).toFixed(2);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function updateCategoryOptions(type) {
  const options = CATEGORIES[type] || [];
  els.category.innerHTML = options
    .map((c) => `<option value="${c}">${c}</option>`)
    .join('');
}

function resetForm() {
  editingId = null;
  els.formTitle.textContent = '添加记录';
  els.submitBtn.textContent = '添加记录';
  els.cancelBtn.classList.add('hidden');
  els.recordId.value = '';
  els.form.reset();
  els.date.value = todayStr();
  updateCategoryOptions(els.type.value);
}

function startEdit(record) {
  editingId = record.id;
  els.formTitle.textContent = '编辑记录';
  els.submitBtn.textContent = '保存修改';
  els.cancelBtn.classList.remove('hidden');
  els.recordId.value = record.id;
  els.date.value = record.date;
  els.type.value = record.type;
  updateCategoryOptions(record.type);
  els.category.value = record.category;
  els.amount.value = record.amount;
  els.note.value = record.note || '';
  els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildQuery() {
  const params = new URLSearchParams();
  const type = els.filterType.value;
  const month = els.filterMonth.value;

  if (type !== 'all') params.set('type', type);
  if (month) params.set('month', month);

  const query = params.toString();
  return query ? `?${query}` : '';
}

function renderSummary() {
  els.totalIncome.textContent = formatMoney(summary.totalIncome);
  els.totalExpense.textContent = formatMoney(summary.totalExpense);
  els.balance.textContent = formatMoney(summary.balance);
}

function renderList() {
  if (records.length === 0) {
    els.recordList.innerHTML = '';
    els.emptyTip.classList.remove('hidden');
    return;
  }

  els.emptyTip.classList.add('hidden');
  els.recordList.innerHTML = records
    .map(
      (r) => `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td><span class="tag ${r.type}">${TYPE_LABELS[r.type]}</span></td>
      <td>${escapeHtml(r.category)}</td>
      <td class="amount-${r.type}">${r.type === 'income' ? '+' : '-'}${formatMoney(r.amount)}</td>
      <td>${escapeHtml(r.note || '—')}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${r.id}">编辑</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}">删除</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');
}

function render() {
  renderSummary();
  renderList();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadSummary() {
  summary = await api('/summary');
}

async function loadRecords() {
  records = await api(`/records${buildQuery()}`);
}

async function refreshAll() {
  await Promise.all([loadSummary(), loadRecords()]);
  render();
}

function openDeleteModal(id) {
  deletingId = id;
  els.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deletingId = null;
  els.deleteModal.classList.add('hidden');
}

els.type.addEventListener('change', () => {
  updateCategoryOptions(els.type.value);
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    date: els.date.value,
    type: els.type.value,
    category: els.category.value,
    amount: parseFloat(els.amount.value),
    note: els.note.value.trim(),
  };

  setLoading(true);
  try {
    if (editingId) {
      await api(`/records/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      showToast('记录已更新', 'success');
    } else {
      await api('/records', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('记录已添加', 'success');
    }

    resetForm();
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
});

els.cancelBtn.addEventListener('click', resetForm);

els.recordList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const record = records.find((r) => r.id === id);
  if (!record) return;

  if (btn.dataset.action === 'edit') {
    startEdit(record);
  } else if (btn.dataset.action === 'delete') {
    openDeleteModal(id);
  }
});

els.filterType.addEventListener('change', async () => {
  setLoading(true);
  try {
    await loadRecords();
    renderList();
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
});

els.filterMonth.addEventListener('change', async () => {
  setLoading(true);
  try {
    await loadRecords();
    renderList();
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
});

els.clearFilter.addEventListener('click', async () => {
  els.filterType.value = 'all';
  els.filterMonth.value = '';
  setLoading(true);
  try {
    await loadRecords();
    renderList();
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
});

els.cancelDelete.addEventListener('click', closeDeleteModal);
els.deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);

els.confirmDelete.addEventListener('click', async () => {
  if (!deletingId) return;

  setLoading(true);
  try {
    await api(`/records/${deletingId}`, { method: 'DELETE' });
    if (editingId === deletingId) resetForm();
    closeDeleteModal();
    showToast('记录已删除', 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
});

async function init() {
  resetForm();
  setLoading(true);
  try {
    await refreshAll();
  } catch (err) {
    showToast('无法连接服务器，请确认后端已启动');
  } finally {
    setLoading(false);
  }
}

init();
