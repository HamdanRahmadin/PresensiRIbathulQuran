// ============================================================
// Utils - Shared Helper Functions
// ============================================================

/**
 * Setup Sidebar UI (Hamburger & Overlay)
 */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btnMenu = document.getElementById('btnMenu');
  const btnClose = document.getElementById('btnCloseSidebar');

  if (!sidebar || !overlay) return;

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }

  if (btnMenu) btnMenu.addEventListener('click', toggleSidebar);
  if (btnClose) btnClose.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
}

/**
 * Render Tab Kelas Dinamis dari CONFIG.KELAS
 * @param {string} containerId - ID elemen kontainer tab
 * @param {boolean} includeSemua - Apakah akan merender tab "Semua"
 * @param {function} onClickCallback - Fungsi callback saat tab di klik (menerima param kelas)
 */
function renderKelasTabs(containerId, includeSemua, onClickCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (includeSemua) {
    const btn = document.createElement('button');
    btn.className = 'filter-tab active'; // Default active
    btn.dataset.kelas = 'semua';
    btn.textContent = 'Semua';
    container.appendChild(btn);
  }

  CONFIG.KELAS.forEach((kelas, index) => {
    const btn = document.createElement('button');
    // Jika tidak ada "Semua", maka kelas pertama jadi default active
    btn.className = (!includeSemua && index === 0) ? 'filter-tab active' : 'filter-tab';
    btn.dataset.kelas = kelas;
    btn.textContent = 'Kelas ' + kelas;
    container.appendChild(btn);
  });

  // Setup event listener
  const tabs = container.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (typeof onClickCallback === 'function') {
        onClickCallback(tab.dataset.kelas);
      }
    });
  });
}

/**
 * Render Option Kelas Dinamis untuk Form Select
 * @param {string} selectId - ID elemen select
 */
function renderKelasOptions(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '';
  CONFIG.KELAS.forEach(kelas => {
    const option = document.createElement('option');
    option.value = kelas;
    option.textContent = 'Kelas ' + kelas;
    select.appendChild(option);
  });
}

/**
 * Escape HTML entities untuk mencegah XSS saat menggunakan innerHTML
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format Date object ke string YYYY-MM-DD untuk API
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format string tanggal YYYY-MM-DD ke tampilan lokal Indonesia
 * @param {string} dateStr - format YYYY-MM-DD
 * @param {object} options - opsi toLocaleDateString (opsional)
 */
function formatDisplayDate(dateStr, options) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  const defaultOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options || defaultOptions);
}

/**
 * Tampilkan toast notification
 * @param {string} message - pesan yang ditampilkan
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('Toast container tidak ditemukan');
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Safely get array from API result
 * Mengembalikan array kosong jika data undefined/null
 */
function safeArray(result) {
  if (result && result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

// Update copyright footer tahun secara dinamis
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  
  const copyrights = document.querySelectorAll('.footer-copyright');
  copyrights.forEach(el => {
    el.textContent = `© ${new Date().getFullYear()} Ribathul Qur'an`;
  });
});
