/* ============================================================
   DEFAULT DATA
   ============================================================ */
const defaultData = {
  name: "Ngô Đức Mạnh",
  headline: "IT Student at UMT & Software Developer",
  status: "Sẵn sàng đón nhận cơ hội mới",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  github: "https://github.com/ngoducmanh-nrd",
  projects: [
    {
      id: "1",
      title: "FlowDrop",
      desc: "Công cụ chia sẻ tệp đa nền tảng nhanh chóng, an toàn và bảo mật.",
      tags: ["C++", "Qt"],
      liveUrl: "",
      repoUrl: "https://github.com/ngoducmanh-nrd/flowdrop"
    },
    {
      id: "2",
      title: "Clipboard Manager",
      desc: "Ứng dụng desktop cho hệ điều hành Windows giúp quản lý lịch sử clipboard hiệu quả.",
      tags: ["Electron", "JavaScript"],
      liveUrl: "",
      repoUrl: "https://github.com/ngoducmanh-nrd/clipboard-manager"
    },
    {
      id: "3",
      title: "Door Invoice App",
      desc: "Web app hỗ trợ số hóa quy trình quản lý hóa đơn cho doanh nghiệp vừa và nhỏ.",
      tags: ["Web", "Fullstack"],
      liveUrl: "https://example.com/invoice",
      repoUrl: ""
    }
  ]
};

/* ============================================================
   HELPERS
   ============================================================ */
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

const safeUrl = (u) => {
  if (!u) return '';
  try {
    const url = new URL(u, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch { return ''; }
};

/* ============================================================
   STATE (merge với default để tránh vỡ schema cũ)
   ============================================================ */
let state;
try {
  const stored = JSON.parse(localStorage.getItem('dark_portfolio_data') || '{}');
  state = { ...defaultData, ...stored, projects: stored.projects || defaultData.projects };
} catch {
  state = structuredClone(defaultData);
}

function saveState() {
  localStorage.setItem('dark_portfolio_data', JSON.stringify(state));
  renderUI();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2600);
}

/* ============================================================
   RENDER UI
   ============================================================ */
function renderUI() {
  // --- Texts ---
  document.getElementById('navName').textContent = state.name;
  document.getElementById('heroName').textContent = state.name;
  document.getElementById('heroHeadline').textContent = state.headline;
  document.getElementById('heroStatusText').textContent = state.status;
  document.getElementById('avatarImage').src = state.avatar;
  document.getElementById('heroGithub').href = state.github;
  const sidebarGh = document.getElementById('sidebarGithub');
  if (sidebarGh) sidebarGh.href = state.github;

  // --- Form ---
  document.getElementById('inputName').value = state.name;
  document.getElementById('inputStatus').value = state.status;
  document.getElementById('inputHeadline').value = state.headline;
  document.getElementById('inputAvatar').value = state.avatar;
  document.getElementById('inputGithub').value = state.github;

  // --- Projects ---
  const container = document.getElementById('projectsContainer');
  container.innerHTML = '';

  if (!state.projects.length) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 glass-card rounded-3xl border-dashed border-white/20">
        <i data-lucide="ghost" class="w-10 h-10 mx-auto mb-3 opacity-50"></i>
        <p class="text-sm">Chưa có dự án nào.</p>
      </div>`;
  } else {
    state.projects.forEach((proj, idx) => {
      const delayClass = `delay-${(idx % 4 + 1) * 100}`;

      const tagsHtml = (proj.tags || []).map((tag) =>
        `<span class="px-2.5 py-1 rounded-md bg-white/5 text-slate-300 text-[11px] font-medium border border-white/10 shadow-sm">${escapeHtml(tag)}</span>`
      ).join('');

      const live = safeUrl(proj.liveUrl);
      const repo = safeUrl(proj.repoUrl);

      const liveHtml = live
        ? `<a href="${live}" target="_blank" rel="noopener" class="spring-btn p-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20" title="Live Demo"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
        : '';
      const repoHtml = repo
        ? `<a href="${repo}" target="_blank" rel="noopener" class="spring-btn p-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10" title="Mã nguồn"><i data-lucide="github" class="w-4 h-4"></i></a>`
        : '';

      const lowerTitle = (proj.title || '').toLowerCase();
      let iconName = 'code-2';
      if (lowerTitle.includes('drop') || lowerTitle.includes('file')) iconName = 'file-box';
      if (lowerTitle.includes('clipboard')) iconName = 'clipboard-list';
      if (lowerTitle.includes('invoice')) iconName = 'receipt';

      const card = document.createElement('div');
      card.className = `glass-card rounded-[24px] p-6 sm:p-8 flex flex-col justify-between animate-spring ${delayClass}`;
      card.innerHTML = `
        <div class="space-y-5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-cyan-400 shadow-inner">
            <i data-lucide="${iconName}" class="w-6 h-6 stroke-[1.5]"></i>
          </div>
          <div>
            <h3 class="font-bold text-lg text-white">${escapeHtml(proj.title)}</h3>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">${escapeHtml(proj.desc)}</p>
          </div>
          <div class="flex flex-wrap gap-2 pt-1">${tagsHtml}</div>
        </div>

        <div class="flex items-center justify-between pt-6 mt-6 border-t border-white/5">
          <div class="flex gap-2">${liveHtml}${repoHtml}</div>
          <button type="button" data-remove-project="${escapeHtml(proj.id)}"
                  class="spring-btn p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                  title="Xóa">
            <i data-lucide="trash" class="w-4 h-4"></i>
          </button>
        </div>`;
      container.appendChild(card);
    });
  }

  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   THEME SWITCHER
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

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderUI();

  /* ---------- Modal ---------- */
  const modal = document.getElementById('editorModal');
  const modalContent = document.getElementById('modalContent');

  const openModal = () => {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    requestAnimationFrame(() => modalContent.classList.remove('scale-95'));
  };
  const closeModal = () => {
    modalContent.classList.add('scale-95');
    setTimeout(() => modal.classList.add('opacity-0', 'pointer-events-none'), 300);
  };

  document.getElementById('openEditorBtn').addEventListener('click', () => {
    closeSidebar();
    openModal();
  });
  document.getElementById('closeEditorBtn').addEventListener('click', closeModal);
  document.getElementById('cancelEditorBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* ---------- Sidebar ---------- */
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarToggle = document.getElementById('sidebarToggle');

  const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    sidebarToggle.classList.add('active');
    sidebarToggle.setAttribute('aria-expanded', 'true');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    sidebarToggle.classList.remove('active');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  };

  const toggleSidebar = () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // Close sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('open')) return;
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
      closeSidebar();
    }
  });

  // Close sidebar when clicking links with data-close-sidebar
  document.querySelectorAll('[data-close-sidebar]').forEach((el) => {
    el.addEventListener('click', () => {
      setTimeout(closeSidebar, 150);
    });
  });

  /* ---------- Delete project (event delegation, XSS-safe) ---------- */
  document.getElementById('projectsContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-project]');
    if (!btn) return;
    const id = btn.getAttribute('data-remove-project');
    state.projects = state.projects.filter((p) => p.id !== id);
    saveState();
    showToast('Đã xóa dự án!');
  });

  /* ---------- Save profile ---------- */
  document.getElementById('profileEditForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.name = document.getElementById('inputName').value.trim() || state.name;
    state.status = document.getElementById('inputStatus').value.trim() || state.status;
    state.headline = document.getElementById('inputHeadline').value.trim() || state.headline;
    state.avatar = document.getElementById('inputAvatar').value.trim() || state.avatar;
    state.github = document.getElementById('inputGithub').value.trim() || state.github;
    saveState();
    closeModal();
    showToast('Cập nhật thành công!');
  });

  /* ---------- Add project ---------- */
  document.getElementById('addNewProjectBtn').addEventListener('click', () => {
    const title = document.getElementById('newProjTitle').value.trim();
    const tags = document.getElementById('newProjTags').value.trim();
    const desc = document.getElementById('newProjDesc').value.trim();
    const live = document.getElementById('newProjLive').value.trim();
    const repo = document.getElementById('newProjRepo').value.trim();

    if (!title || !desc) {
      showToast('Vui lòng nhập Tên và Mô tả dự án.');
      return;
    }

    const tagsArray = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : ['Code'];

    state.projects.unshift({
      id: Date.now().toString(),
      title, desc,
      liveUrl: live,
      repoUrl: repo,
      tags: tagsArray
    });
    saveState();

    ['newProjTitle', 'newProjTags', 'newProjDesc', 'newProjLive', 'newProjRepo']
      .forEach((id) => { document.getElementById(id).value = ''; });

    showToast('Đã thêm dự án!');
  });

  /* ---------- Reset ---------- */
  document.getElementById('resetDataBtn').addEventListener('click', () => {
    state = structuredClone(defaultData);
    localStorage.removeItem('dark_portfolio_data');
    saveState();
    closeModal();
    showToast('Đã khôi phục dữ liệu mặc định.');
  });
});
/* ============================================================
   BRIDGE cho auth.js (append, không sửa code phía trên)
   ============================================================ */
window.portfolio = {
  getState: () => state,
  setState: (s) => { state = s; },
  renderUI,
  saveState,
  showToast
};