import { supabase } from "../../supabaseConfig.js";

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('portfolio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  const inputs = document.querySelectorAll('input[name="theme"]');
  inputs.forEach((inp) => {
    if (inp.value === saved) inp.checked = true;
    inp.addEventListener('change', (e) => {
      if (!e.target.checked) return;
      const theme = e.target.value;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('portfolio_theme', theme);
    });
  });
}

initTheme();

/* ============================================================
   STATE
   ============================================================ */
let notes = [];
let currentUser = null;
let searchQuery = '';
let tagFilter = '';
let selectedColor = 'default';
let selectedIds = new Set();

/* ============================================================
   HELPERS
   ============================================================ */
const COLOR_META = {
  'default': { label: 'Mặc định', bg: 'bg-slate-800/60', border: 'border-slate-600', dot: 'bg-slate-500' },
  'yellow': { label: 'Vàng', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', dot: 'bg-yellow-400' },
  'green': { label: 'Xanh lá', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  'blue': { label: 'Xanh dương', bg: 'bg-blue-500/10', border: 'border-blue-500/40', dot: 'bg-blue-400' },
  'pink': { label: 'Hồng', bg: 'bg-pink-500/10', border: 'border-pink-500/40', dot: 'bg-pink-400' },
  'purple': { label: 'Tím', bg: 'bg-purple-500/10', border: 'border-purple-500/40', dot: 'bg-purple-400' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 2400);
}

function parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

function tagsToStr(arr) {
  return Array.isArray(arr) ? arr.join(', ') : (arr || '');
}

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
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

  if (isIn) await loadNotes();
}

/* ============================================================
   LOAD
   ============================================================ */
async function loadNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Không load được ghi chú: ' + error.message);
    return;
  }
  notes = data || [];
  renderAll();
}

/* ============================================================
   RENDER
   ============================================================ */
function renderTagFilter() {
  const allTags = new Set();
  notes.forEach(n => parseTags(n.tags).forEach(t => allTags.add(t)));
  const sel = document.getElementById('tagFilter');
  const cur = sel.value;
  sel.innerHTML = `<option value="">Tất cả tag</option>` +
    [...allTags].sort().map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  sel.value = cur;
}

function renderColorPicker() {
  const el = document.getElementById('colorPicker');
  el.innerHTML = Object.entries(COLOR_META).map(([key, meta]) => `
    <button type="button" data-color="${key}"
      class="w-8 h-8 rounded-full border-2 ${meta.border} ${meta.dot} transition-transform ${selectedColor === key ? 'scale-110 ring-2 ring-white/40' : 'opacity-70 hover:opacity-100'
    }" title="${meta.label}"></button>
  `).join('');
}

function renderGrid() {
  const grid = document.getElementById('notesGrid');
  const empty = document.getElementById('emptyState');

  let list = notes;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tags || '').toLowerCase().includes(q)
    );
  }
  if (tagFilter) {
    list = list.filter(n => parseTags(n.tags).includes(tagFilter));
  }

  if (!list.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = list.map(n => {
    const meta = COLOR_META[n.color] || COLOR_META.default;
    const tagArr = parseTags(n.tags);
    const isSelected = selectedIds.has(String(n.id));

    const tagsHtml = tagArr.length
      ? `<div class="flex flex-wrap gap-1 mt-2">${tagArr.map(t =>
        `<span class="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">${esc(t)}</span>`
      ).join('')}</div>`
      : '';

    const preview = (n.content || '').slice(0, 300);

    return `
      <div data-id="${n.id}" class="note-card relative mb-4 glass-card ${meta.bg} ${meta.border} rounded-2xl p-4 pt-11 cursor-pointer hover:border-white/30 transition-all break-inside-avoid ${isSelected ? 'ring-2 ring-cyan-500/60 !border-cyan-500/60' : ''}">

        <!-- Checkbox chọn (góc trên trái) -->
        <button data-action="select" data-id="${n.id}" title="${isSelected ? 'Bỏ chọn' : 'Chọn'}"
          class="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900/90 text-slate-300 transition-colors">
          <i data-lucide="${isSelected ? 'check-square' : 'square'}" class="w-4 h-4 ${isSelected ? 'text-cyan-400' : ''}"></i>
        </button>

        <!-- Nút xóa nhanh (góc trên phải, hover mới hiện) -->
        <button data-action="delete" data-id="${n.id}" title="Xóa ghi chú"
          class="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity md:opacity-0"
          style="opacity:0" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>

        <!-- Nội dung -->
        <div>
          ${n.pinned ? `<div class="absolute top-2 right-10"><i data-lucide="pin" class="w-3.5 h-3.5 text-amber-400 fill-amber-400"></i></div>` : ''}
          ${n.title ? `<h3 class="font-semibold text-white text-sm mb-1 break-words pr-2">${esc(n.title)}</h3>` : ''}
          <p class="text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed mt-1">${esc(preview)}${n.content.length > 300 ? '…' : ''}</p>
          ${tagsHtml}
        </div>

        <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-500">
          <span>${timeAgo(n.updated_at)}</span>
          <div class="flex items-center gap-1">
            <button data-action="copy" data-id="${n.id}" title="Copy"
              class="p-1 rounded hover:bg-white/10 hover:text-cyan-400 transition-colors">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            <button data-action="pin" data-id="${n.id}" title="${n.pinned ? 'Bỏ ghim' : 'Ghim'}"
              class="p-1 rounded hover:bg-white/10 hover:text-amber-400 transition-colors">
              <i data-lucide="pin" class="w-3.5 h-3.5 ${n.pinned ? 'fill-current text-amber-400' : ''}"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderAll() {
  renderTagFilter();
  renderColorPicker();
  renderGrid();
  renderSelectionBar();
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   SELECTION (multi-select)
   ============================================================ */
function renderSelectionBar() {
  const bar = document.getElementById('selectionBar');
  const count = document.getElementById('selCount');
  if (!bar || !count) return;

  const n = selectedIds.size;
  if (n > 0) {
    bar.classList.remove('hidden');
    bar.classList.add('flex');
    count.textContent = n;
  } else {
    bar.classList.add('hidden');
    bar.classList.remove('flex');
  }
}

function toggleSelect(id) {
  const sid = String(id);
  if (selectedIds.has(sid)) selectedIds.delete(sid);
  else selectedIds.add(sid);
  renderGrid();
  renderSelectionBar();
}

function clearSelection() {
  selectedIds.clear();
  renderGrid();
  renderSelectionBar();
}

async function deleteNoteById(id) {
  if (!confirm('Xóa ghi chú này?')) return;
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) { showToast('Lỗi: ' + error.message); return; }
  selectedIds.delete(String(id));
  showToast('Đã xóa');
  await loadNotes();
  renderSelectionBar();
}

async function deleteSelected() {
  const n = selectedIds.size;
  if (n === 0) return;
  if (!confirm(`Xóa ${n} ghi chú đã chọn?`)) return;

  const ids = [...selectedIds];
  const { error } = await supabase.from('notes').delete().in('id', ids);
  if (error) { showToast('Lỗi: ' + error.message); return; }

  selectedIds.clear();
  showToast(`Đã xóa ${n} ghi chú`);
  await loadNotes();
  renderSelectionBar();
}

/* ============================================================
   ACTIONS
   ============================================================ */
async function quickAdd() {
  const input = document.getElementById('quickInput');
  const content = input.value.trim();
  if (!content) return;

  const { error } = await supabase.from('notes').insert({
    content, color: 'default', pinned: false
  });
  if (error) { showToast('Lỗi: ' + error.message); return; }
  input.value = '';
  showToast('Đã lưu ghi chú');
  await loadNotes();
}

async function togglePin(id) {
  const n = notes.find(x => String(x.id) === String(id));
  if (!n) return;
  const { error } = await supabase.from('notes')
    .update({ pinned: !n.pinned, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { showToast('Lỗi: ' + error.message); return; }
  showToast(n.pinned ? 'Đã bỏ ghim' : 'Đã ghim');
  await loadNotes();
}

async function copyNote(id) {
  const n = notes.find(x => String(x.id) === String(id));
  if (!n) return;
  const text = (n.title ? n.title + '\n' : '') + (n.content || '');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Đã copy vào clipboard');
  } catch {
    showToast('Không copy được (cần HTTPS hoặc localhost)');
  }
}

/* ============================================================
   MODAL
   ============================================================ */
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

function openModal(note = null) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => modalContent.classList.remove('scale-95'));

  document.getElementById('modalTitle').textContent = note ? 'Sửa ghi chú' : 'Thêm ghi chú';
  document.getElementById('editId').value = note?.id ?? '';
  document.getElementById('fTitle').value = note?.title ?? '';
  document.getElementById('fContent').value = note?.content ?? '';
  document.getElementById('fTags').value = tagsToStr(note?.tags);
  document.getElementById('fPinned').checked = !!note?.pinned;
  selectedColor = note?.color ?? 'default';

  document.getElementById('deleteBtn').classList.toggle('hidden', !note);
  document.getElementById('copyBtn').classList.toggle('hidden', !note);

  renderColorPicker();
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
async function saveNote(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const payload = {
    title: document.getElementById('fTitle').value.trim(),
    content: document.getElementById('fContent').value.trim(),
    tags: document.getElementById('fTags').value.trim(),
    pinned: document.getElementById('fPinned').checked,
    color: selectedColor,
    updated_at: new Date().toISOString(),
  };

  if (!payload.content) { showToast('Chưa nhập nội dung'); return; }

  if (id) {
    const { error } = await supabase.from('notes').update(payload).eq('id', id);
    if (error) { showToast('Lỗi: ' + error.message); return; }
    showToast('Đã cập nhật');
  } else {
    const { error } = await supabase.from('notes').insert(payload);
    if (error) { showToast('Lỗi: ' + error.message); return; }
    showToast('Đã thêm');
  }
  closeModal();
  await loadNotes();
}

async function deleteNote() {
  const id = document.getElementById('editId').value;
  if (!id) return;
  if (!confirm('Xóa ghi chú này?')) return;
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) { showToast('Lỗi: ' + error.message); return; }
  showToast('Đã xóa');
  closeModal();
  await loadNotes();
}

/* ============================================================
   EVENTS
   ============================================================ */
document.getElementById('quickAddBtn').addEventListener('click', quickAdd);
document.getElementById('quickInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); quickAdd(); }
});

document.getElementById('openFullBtn').addEventListener('click', () => openModal());

document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('deleteBtn').addEventListener('click', deleteNote);
document.getElementById('copyBtn').addEventListener('click', () => {
  const id = document.getElementById('editId').value;
  if (id) copyNote(id);
});
document.getElementById('noteForm').addEventListener('submit', saveNote);

modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.getElementById('colorPicker').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-color]');
  if (!btn) return;
  selectedColor = btn.dataset.color;
  renderColorPicker();
});

document.getElementById('notesGrid').addEventListener('click', async (e) => {
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    e.stopPropagation();
    const id = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;

    if (action === 'copy') await copyNote(id);
    else if (action === 'pin') await togglePin(id);
    else if (action === 'select') toggleSelect(id);
    else if (action === 'delete') await deleteNoteById(id);
    return;
  }

  const card = e.target.closest('[data-id]');
  if (!card) return;

  // Nếu đang có note được chọn → click card = toggle selection, không mở modal
  if (selectedIds.size > 0) {
    toggleSelect(card.dataset.id);
    return;
  }

  const note = notes.find(n => String(n.id) === card.dataset.id);
  if (note) openModal(note);
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderGrid();
});

document.getElementById('tagFilter').addEventListener('change', (e) => {
  tagFilter = e.target.value;
  renderGrid();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);

/* ============================================================
   INIT
   ============================================================ */

checkAuth();
if (window.lucide) lucide.createIcons();