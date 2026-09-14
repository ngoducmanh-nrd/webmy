import { supabase } from "./supabaseConfig.js";

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('portfolio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.querySelectorAll('input[name="theme"]').forEach((inp) => {
    if (inp.value === saved) inp.checked = true;
    inp.addEventListener('change', (e) => {
      if (!e.target.checked) return;
      document.documentElement.setAttribute('data-theme', e.target.value);
      localStorage.setItem('portfolio_theme', e.target.value);
    });
  });
}
initTheme();

/* ============================================================
   STATE
   ============================================================ */
let tasks = [];
let currentUser = null;
let sortables = [];

/* ============================================================
   HELPERS
   ============================================================ */
const PRIORITY_META = {
  'high':   { label: 'Cao',  dot: 'bg-red-500',    text: 'text-red-400',    border: 'border-red-500/40' },
  'medium': { label: 'Vừa',  dot: 'bg-amber-500',  text: 'text-amber-400',  border: 'border-amber-500/40' },
  'low':    { label: 'Thấp', dot: 'bg-slate-500',  text: 'text-slate-400',  border: 'border-slate-500/40' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 2200);
}

function parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

function tagsToStr(arr) {
  return Array.isArray(arr) ? arr.join(', ') : (arr || '');
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;
  const d = new Date(dueDate + 'T23:59:59');
  return d.getTime() < Date.now();
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/* ============================================================
   AUTH
   ============================================================ */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  const isIn = !!currentUser;

  document.getElementById('authGate').classList.toggle('hidden', isIn);
  document.getElementById('app').classList.toggle('hidden', !isIn);
  document.getElementById('logoutBtn').classList.toggle('hidden', !isIn);
  document.getElementById('loginLink').classList.toggle('hidden', isIn);

  if (isIn) await loadTasks();
}

/* ============================================================
   LOAD
   ============================================================ */
async function loadTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Không load được task: ' + error.message);
    return;
  }
  tasks = data || [];
  renderAll();
}

/* ============================================================
   RENDER
   ============================================================ */
function renderStats() {
  const todo = tasks.filter(t => t.status === 'todo').length;
  const doing = tasks.filter(t => t.status === 'doing').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => isOverdue(t.due_date, t.status)).length;

  const stats = [
    { label: 'Cần làm',  value: todo,    icon: 'inbox',        color: 'slate' },
    { label: 'Đang làm', value: doing,   icon: 'play-circle',  color: 'cyan' },
    { label: 'Đã xong',  value: done,    icon: 'check-circle', color: 'emerald' },
    { label: 'Quá hạn',  value: overdue, icon: 'alert-circle', color: 'red' },
  ];

  document.getElementById('statsRow').innerHTML = stats.map(s => `
    <div class="glass-card rounded-2xl p-4">
      <div class="flex items-center gap-2 text-${s.color}-400 mb-2">
        <i data-lucide="${s.icon}" class="w-4 h-4"></i>
        <span class="text-[11px] font-semibold uppercase tracking-wide">${s.label}</span>
      </div>
      <p class="text-2xl font-bold text-white">${s.value}</p>
    </div>
  `).join('');
}

function taskCard(t) {
  const p = PRIORITY_META[t.priority] || PRIORITY_META.medium;
  const overdue = isOverdue(t.due_date, t.status);
  const tagArr = parseTags(t.tags);

  const dueBadge = t.due_date
    ? `<span class="text-[10px] px-1.5 py-0.5 rounded ${
        overdue ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-400 border border-white/10'
      }">${overdue ? '⚠ ' : ''}${fmtDate(t.due_date)}</span>`
    : '';

  const tagsBadges = tagArr.slice(0, 3).map(tg =>
    `<span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">${esc(tg)}</span>`
  ).join('');

  return `
    <div data-id="${t.id}" class="task-card glass-card ${p.border} rounded-xl p-3 cursor-pointer hover:border-white/30 transition-all">
      <div class="flex items-start gap-2">
        <span class="w-1.5 h-1.5 rounded-full ${p.dot} mt-2 shrink-0"></span>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-white text-sm ${t.status === 'done' ? 'line-through opacity-60' : ''} break-words">${esc(t.title)}</h4>
          ${t.desc ? `<p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${esc(t.desc)}</p>` : ''}
          ${(dueBadge || tagsBadges) ? `<div class="flex flex-wrap gap-1 mt-2">${dueBadge}${tagsBadges}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderBoard() {
  ['todo', 'doing', 'done'].forEach(status => {
    const list = document.getElementById('list-' + status);
    if (!list) return;
    const filtered = tasks
      .filter(t => t.status === status)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || new Date(b.updated_at) - new Date(a.updated_at));
    list.innerHTML = filtered.map(taskCard).join('');
  });

  // Update counts
  ['todo', 'doing', 'done'].forEach(status => {
    const el = document.querySelector(`[data-count="${status}"]`);
    if (el) {
      const n = tasks.filter(t => t.status === status).length;
      el.textContent = `(${n})`;
    }
  });

  if (window.lucide) lucide.createIcons();
}

function renderAll() {
  renderStats();
  renderBoard();
}

/* ============================================================
   DRAG & DROP (Sortable.js)
   ============================================================ */
function initSortables() {
  // Destroy cũ nếu có
  sortables.forEach(s => { try { s.destroy(); } catch {} });
  sortables = [];

  ['todo', 'doing', 'done'].forEach(status => {
    const el = document.getElementById('list-' + status);
    if (!el) return;

    const s = new Sortable(el, {
      group: 'tasks',
      animation: 180,
      ghostClass: 'opacity-40',
      dragClass: 'rotate-2',
      onEnd: async (evt) => {
        const taskId = evt.item.dataset.id;
        const newStatus = evt.to.dataset.status;
        const oldStatus = evt.from.dataset.status;

        // Reindex cả 2 cột
        await reindexColumn(newStatus);
        if (oldStatus !== newStatus) await reindexColumn(oldStatus);

        // Update local state
        const t = tasks.find(x => String(x.id) === String(taskId));
        if (t) {
          t.status = newStatus;
          if (oldStatus !== newStatus) {
            t.updated_at = new Date().toISOString();
          }
        }
        renderStats();
        renderBoard();

        if (oldStatus !== newStatus) {
          if (newStatus === 'done') showToast('✅ Đã hoàn thành!');
          else if (newStatus === 'doing') showToast('🚀 Bắt đầu làm');
        }
      },
    });
    sortables.push(s);
  });
}

async function reindexColumn(status) {
  const list = document.getElementById('list-' + status);
  if (!list) return;
  const cards = [...list.querySelectorAll('.task-card')];
  const updates = cards.map((c, i) => ({
    id: c.dataset.id,
    position: i,
    status,
  }));

  // Batch update
  await Promise.all(updates.map(u =>
    supabase.from('tasks').update({ position: u.position, status: u.status }).eq('id', u.id)
  ));

  // Sync local positions
  updates.forEach(u => {
    const t = tasks.find(x => String(x.id) === String(u.id));
    if (t) {
      t.position = u.position;
      t.status = u.status;
    }
  });
}

/* ============================================================
   MODAL
   ============================================================ */
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

function openModal(task = null, defaultStatus = 'todo') {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => modalContent.classList.remove('scale-95'));

  document.getElementById('modalTitle').textContent = task ? 'Sửa task' : 'Thêm task';
  document.getElementById('editId').value    = task?.id ?? '';
  document.getElementById('fTitle').value    = task?.title ?? '';
  document.getElementById('fDesc').value     = task?.desc ?? '';
  document.getElementById('fStatus').value   = task?.status ?? defaultStatus;
  document.getElementById('fPriority').value = task?.priority ?? 'medium';
  document.getElementById('fDue').value      = task?.due_date ?? '';
  document.getElementById('fTags').value     = tagsToStr(task?.tags);
  document.getElementById('deleteBtn').classList.toggle('hidden', !task);
}

function closeModal() {
  modalContent.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 200);
}

/* ============================================================
   SAVE / DELETE
   ============================================================ */
async function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const payload = {
    title:      document.getElementById('fTitle').value.trim(),
    desc:       document.getElementById('fDesc').value.trim(),
    status:     document.getElementById('fStatus').value,
    priority:   document.getElementById('fPriority').value,
    due_date:   document.getElementById('fDue').value || null,
    tags:       document.getElementById('fTags').value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.title) { showToast('Chưa nhập tiêu đề'); return; }

  if (id) {
    const { error } = await supabase.from('tasks').update(payload).eq('id', id);
    if (error) { showToast('Lỗi: ' + error.message); return; }
    showToast('Đã cập nhật');
  } else {
    // Position = max + 1 trong cột đích
    const sameCol = tasks.filter(t => t.status === payload.status);
    payload.position = sameCol.length ? Math.max(...sameCol.map(t => t.position ?? 0)) + 1 : 0;

    const { error } = await supabase.from('tasks').insert(payload);
    if (error) { showToast('Lỗi: ' + error.message); return; }
    showToast('Đã thêm');
  }
  closeModal();
  await loadTasks();
  initSortables();
}

async function deleteTask() {
  const id = document.getElementById('editId').value;
  if (!id) return;
  if (!confirm('Xóa task này?')) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) { showToast('Lỗi: ' + error.message); return; }
  showToast('Đã xóa');
  closeModal();
  await loadTasks();
  initSortables();
}

/* ============================================================
   EVENTS
   ============================================================ */
document.querySelectorAll('[data-add-status]').forEach(btn => {
  btn.addEventListener('click', () => openModal(null, btn.dataset.addStatus));
});

document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('deleteBtn').addEventListener('click', deleteTask);
document.getElementById('taskForm').addEventListener('submit', saveTask);

modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.querySelectorAll('.task-list').forEach(list => {
  list.addEventListener('click', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const t = tasks.find(x => String(x.id) === card.dataset.id);
    if (t) openModal(t);
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

/* ============================================================
   INIT
   ============================================================ */
(async () => {
  await checkAuth();
  initSortables();
})();
if (window.lucide) lucide.createIcons();