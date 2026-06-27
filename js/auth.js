// ============================================================
// Auth - Autentikasi Sederhana & Multi-Akun
// ============================================================

const Auth = {
  isLoggedIn() {
    return sessionStorage.getItem('loggedIn') === 'true';
  },

  getUser() {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  },

  setLoggedIn(userData) {
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('user', JSON.stringify(userData));
  },

  logout() {
    sessionStorage.removeItem('loggedIn');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
  },

  // Cek di setiap halaman (kecuali login)
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  // Cek apakah user adalah admin
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  // Ambil kelas yang diizinkan untuk diakses user ini
  // Mengembalikan kelas tertentu (misal 'A') jika ustaz, atau 'all' jika admin
  getAllowedKelas() {
    const user = this.getUser();
    if (!user) return '';
    if (user.role === 'admin') return 'all';
    return user.kelas || ''; // 'A', 'B', 'C', atau 'D'
  },

  // Sembunyikan menu admin jika user adalah ustaz
  initUI() {
    if (this.isLoggedIn() && !this.isAdmin()) {
      // Sembunyikan seluruh bottom-nav
      const bottomNav = document.querySelector('.bottom-nav');
      if (bottomNav) bottomNav.classList.add('hidden');

      // Sembunyikan judul "Menu Cepat" di dashboard
      document.querySelectorAll('.card-title').forEach(el => {
        if (el.textContent.includes('Menu Cepat')) {
          el.classList.add('hidden');
        }
      });

      // Sembunyikan tombol Santri, Rekap, Libur di quick-actions
      document.querySelectorAll(
        'a[href="santri.html"], a[href="rekap.html"], a[href="libur.html"]'
      ).forEach(el => {
        el.classList.add('hidden');
      });

      // Tengahkan tombol Presensi yang tersisa
      const qa = document.querySelector('.quick-actions');
      if (qa) {
        qa.style.display = 'flex';
        qa.style.justifyContent = 'center';
      }
    }
  }
};

// Jalankan initUI secara otomatis saat DOM dimuat
document.addEventListener('DOMContentLoaded', () => {
  Auth.initUI();

  // Tambahkan listener logout global
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });

  // Registrasi Service Worker untuk PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered successfully:', reg))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
});
