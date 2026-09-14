import { supabase } from "./supabaseConfig.js";

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
let items = [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;

/* ============================================================
   HELPERS
   ============================================================ */
const STATUS_META = {
  'watching': { label: 'Đang xem', color: 'cyan' },
  'completed': { label: 'Đã xong', color: 'emerald' },
  'plan': { label: 'Dự định', color: 'purple' },
  'on-hold': { label: 'Tạm dừng', color: 'amber' },
  'dropped': { label: 'Bỏ', color: 'red' },
};

const TYPE_LABEL = {
  'anime': 'Anime',
  'manga': 'Manga',
  'donghua': 'HHTQ',
  'movie': 'Phim',
  'series': 'Series',
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

/* ============================================================
   AUTH GATE
   ============================================================ */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;

  const isIn = !!currentUser;
  document.getElementById('authGate').classList.toggle('hidden', isIn);
  document.getElementById('app').classList.toggle('hidden', !isIn);
  document.getElementById('addBtn').classList.toggle('hidden', !isIn);
  document.getElementById('logoutBtn').classList.toggle('hidden', !isIn);
  document.getElementById('loginLink').classList.toggle('hidden', isIn);

  if (isIn) await loadItems();
}

/* ============================================================
   LOAD
   ============================================================ */
async function loadItems() {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Không load được watchlist: ' + error.message);
    return;
  }
  items = data || [];
  renderAll();
}

/* ============================================================
   RENDER
   ============================================================ */
function renderStats() {
  const counts = { watching: 0, completed: 0, plan: 0, onHold: 0 };
  items.forEach((i) => {
    if (i.status === 'watching') counts.watching++;
    else if (i.status === 'completed') counts.completed++;
    else if (i.status === 'plan') counts.plan++;
    else if (i.status === 'on-hold') counts.onHold++;
  });

  const stats = [
    { label: 'Đang xem', value: counts.watching, icon: 'play-circle', color: 'cyan' },
    { label: 'Đã xong', value: counts.completed, icon: 'check-circle', color: 'emerald' },
    { label: 'Dự định xem', value: counts.plan, icon: 'list-todo', color: 'purple' },
    { label: 'Tạm dừng', value: counts.onHold, icon: 'pause-circle', color: 'amber' },
  ];

  document.getElementById('statsRow').innerHTML = stats.map((s) => `
    <div class="glass-card rounded-2xl p-4">
      <div class="flex items-center gap-2 text-${s.color}-400 mb-2">
        <i data-lucide="${s.icon}" class="w-4 h-4"></i>
        <span class="text-[11px] font-semibold uppercase tracking-wide">${s.label}</span>
      </div>
      <p class="text-2xl font-bold text-white">${s.value}</p>
    </div>
  `).join('');
}

function renderFilterTabs() {
  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'watching', label: 'Đang xem' },
    { id: 'completed', label: 'Đã xong' },
    { id: 'plan', label: 'Dự định' },
    { id: 'on-hold', label: 'Tạm dừng' },
    { id: 'dropped', label: 'Bỏ' },
  ];
  document.getElementById('filterTabs').innerHTML = tabs.map((t) => {
    const active = currentFilter === t.id;
    return `<button data-filter="${t.id}"
      class="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${active
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
      }">${t.label}</button>`;
  }).join('');
}

function renderGrid() {
  const grid = document.getElementById('watchGrid');
  const empty = document.getElementById('emptyState');

  let list = items;
  if (currentFilter !== 'all') list = list.filter((i) => i.status === currentFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((i) => (i.title || '').toLowerCase().includes(q));
  }

  if (!list.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = list.map((it) => {
    const meta = STATUS_META[it.status] || STATUS_META.watching;
    const progress = it.total_ep > 0
      ? Math.min(100, Math.round((it.current_ep / it.total_ep) * 100))
      : 0;
    const eps = it.total_ep > 0
      ? `${it.current_ep}/${it.total_ep} tập`
      : it.current_ep > 0 ? `${it.current_ep} tập` : '—';

    const cover = it.cover_url
      ? `<img src="${esc(it.cover_url)}" alt="" class="w-16 h-20 rounded-lg object-cover shrink-0 bg-slate-800"
           onerror="this.onerror=null;this.style.display='none';" />`
      : `<div class="w-16 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0">
           <i data-lucide="image" class="w-5 h-5 text-slate-600"></i>
         </div>`;

    const rating = it.rating != null
      ? `<span class="text-xs text-amber-400 font-semibold">★ ${it.rating}/10</span>`
      : '';

    const canIncrement = it.total_ep === 0 || it.current_ep < it.total_ep;
    const canDecrement = it.current_ep > 0;

    return `
      <div data-id="${it.id}" class="watch-card glass-card rounded-2xl p-4 cursor-pointer hover:border-white/30 transition-all">
        <div class="flex gap-3">
          ${cover}
          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-${meta.color}-500/15 text-${meta.color}-400 border border-${meta.color}-500/30">${meta.label}</span>
              <span class="text-[10px] text-slate-500">${TYPE_LABEL[it.type] || it.type}</span>
            </div>
            <h3 class="font-semibold text-white text-sm truncate" title="${esc(it.title)}">${esc(it.title)}</h3>
            <div class="flex items-center justify-between text-[11px] text-slate-500">
              <span>${eps}</span>
              ${rating}
            </div>
            ${it.total_ep > 0 ? `
              <div class="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style="width:${progress}%"></div>
              </div>` : ''}
          </div>
        </div>
        ${it.notes ? `<p class="text-[11px] text-slate-500 mt-3 line-clamp-2">${esc(it.notes)}</p>` : ''}

        ${(canIncrement || canDecrement) ? `
          <div class="mt-3 pt-3 border-t border-white/5 flex items-center justify-end gap-2">
            ${canDecrement ? `
              <button data-action="dec" data-id="${it.id}" title="Bớt 1 tập"
                class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs border border-white/10 transition-colors">
                −1
              </button>` : ''}
            ${canIncrement ? `
              <button data-action="inc" data-id="${it.id}" title="Đã xem thêm 1 tập"
                class="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition-colors flex items-center gap-1">
                <i data-lucide="plus" class="w-3 h-3"></i>
                <span>1 tập</span>
              </button>` : ''}
          </div>` : ''}
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderAll() {
  renderStats();
  renderFilterTabs();
  renderGrid();
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   CHANGE EPISODE (+1 / -1)
   ============================================================ */
async function changeEpisode(id, delta) {
  const item = items.find((i) => String(i.id) === String(id));
  if (!item) return;

  let newEp = (item.current_ep || 0) + delta;
  if (newEp < 0) newEp = 0;
  if (item.total_ep > 0 && newEp > item.total_ep) newEp = item.total_ep;

  const updates = {
    current_ep: newEp,
    updated_at: new Date().toISOString(),
  };

  if (item.total_ep > 0 && newEp === item.total_ep && item.status === 'watching') {
    updates.status = 'completed';
  }
  if (item.total_ep > 0 && newEp < item.total_ep && item.status === 'completed') {
    updates.status = 'watching';
  }

  const { error } = await supabase.from('watchlist').update(updates).eq('id', id);
  if (error) {
    showToast('Lỗi: ' + error.message);
    return;
  }

  Object.assign(item, updates);
  renderAll();

  if (updates.status === 'completed') {
    showToast(`🎉 Đã xong "${item.title}"!`);
  } else {
    showToast(delta > 0 ? `+1 tập → ${newEp}` : `−1 tập → ${newEp}`);
  }
}

/* ============================================================
   MODAL
   ============================================================ */
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

function openModal(item = null) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => modalContent.classList.remove('scale-95'));

  document.getElementById('modalTitle').textContent = item ? 'Sửa bộ' : 'Thêm bộ mới';
  document.getElementById('editId').value = item?.id ?? '';
  document.getElementById('fTitle').value = item?.title ?? '';
  document.getElementById('fType').value = item?.type ?? 'anime';
  document.getElementById('fStatus').value = item?.status ?? 'watching';
  document.getElementById('fCurrent').value = item?.current_ep ?? 0;
  document.getElementById('fTotal').value = item?.total_ep ?? 0;
  document.getElementById('fRating').value = item?.rating ?? '';
  document.getElementById('fCover').value = item?.cover_url ?? '';
  document.getElementById('fNotes').value = item?.notes ?? '';
  document.getElementById('deleteBtn').classList.toggle('hidden', !item);
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
async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const payload = {
    title: document.getElementById('fTitle').value.trim(),
    type: document.getElementById('fType').value,
    status: document.getElementById('fStatus').value,
    current_ep: parseInt(document.getElementById('fCurrent').value) || 0,
    total_ep: parseInt(document.getElementById('fTotal').value) || 0,
    rating: document.getElementById('fRating').value === '' ? null : parseInt(document.getElementById('fRating').value),
    cover_url: document.getElementById('fCover').value.trim(),
    notes: document.getElementById('fNotes').value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.title) { showToast('Chưa nhập tên bộ'); return; }

  if (id) {
    const { error } = await supabase.from('watchlist').update(payload).eq('id', id);
    if (error) { showToast('Lỗi: ' + error.message); return; }
    showToast('Đã cập nhật');
  } else {
    const { error } = await supabase.from('watchlist').insert(payload);
    if (error) { showToast('Lỗi: ' + error.message); return; }
    showToast('Đã thêm');
  }

  closeModal();
  await loadItems();
}

async function deleteItem() {
  const id = document.getElementById('editId').value;
  if (!id) return;
  if (!confirm('Xóa bộ này?')) return;
  const { error } = await supabase.from('watchlist').delete().eq('id', id);
  if (error) { showToast('Lỗi: ' + error.message); return; }
  showToast('Đã xóa');
  closeModal();
  await loadItems();
}

/* ============================================================
   EVENTS
   ============================================================ */
document.getElementById('addBtn').addEventListener('click', () => openModal());
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('deleteBtn').addEventListener('click', deleteItem);
document.getElementById('watchForm').addEventListener('submit', saveItem);

modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.getElementById('watchGrid').addEventListener('click', async (e) => {
  // Ưu tiên check nút +1 / -1
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    e.stopPropagation();
    const delta = actionBtn.dataset.action === 'inc' ? 1 : -1;
    await changeEpisode(actionBtn.dataset.id, delta);
    return;
  }

  // Nếu không phải nút thì mở modal
  const card = e.target.closest('[data-id]');
  if (!card) return;
  const item = items.find((i) => String(i.id) === card.dataset.id);
  if (item) openModal(item);
});

document.getElementById('filterTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  renderFilterTabs();
  renderGrid();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderGrid();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

/* ============================================================
   INIT
   ============================================================ */
checkAuth();
if (window.lucide) lucide.createIcons();