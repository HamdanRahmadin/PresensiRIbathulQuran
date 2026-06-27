// ============================================================
// Utils - Shared Helper Functions
// ============================================================

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
  const copyrights = document.querySelectorAll('.footer-copyright');
  copyrights.forEach(el => {
    el.textContent = `© ${new Date().getFullYear()} Ribathul Qur'an`;
  });
});
