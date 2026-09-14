/* ============================================================
   PAGE TRANSITIONS — fade in/out khi chuyển trang
   ============================================================ */
(function () {
  // Fade in khi trang load xong
  function enter() {
    document.documentElement.classList.remove('js-loading');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enter, { once: true });
  } else {
    enter();
  }

  // Safety: nếu vì lý do nào đó DOMContentLoaded không chạy,
  // tự remove sau 1s để không bị đen thui
  setTimeout(enter, 1000);

  // Nếu user bật "giảm chuyển động" → không intercept link
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const EXIT_MS = 240;

  function shouldIntercept(a, e) {
    if (!a || !a.href) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (e.button !== 0) return false;
    if (a.target === '_blank') return false;
    if (a.hasAttribute('download')) return false;
    if (a.dataset.noTransition !== undefined) return false;

    let url;
    try { url = new URL(a.href, location.href); }
    catch { return false; }

    // Chỉ nội bộ cùng origin
    if (url.origin !== location.origin) return false;

    // Bỏ qua link anchor nội trang (#hero, #projects)
    if (url.pathname === location.pathname
        && url.search === location.search
        && url.hash) return false;

    return true;
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!shouldIntercept(a, e)) return;

    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => { location.href = a.href; }, EXIT_MS);
  });

  // Khi user bấm Back → trang được restore từ BFCache
  // Phải xóa class page-exit để không bị đen thui
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.remove('page-exit');
    }
  });
})();