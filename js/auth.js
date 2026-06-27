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

  // Sembunyikan menu berdasarkan role
  initUI() {
    if (!this.isLoggedIn()) return;

    if (this.isAdmin()) {
      // --- AKSI UNTUK ADMIN ---
      
      // 1. Sembunyikan tombol kembali (btn-back) di semua halaman
      document.querySelectorAll('.btn-back').forEach(btn => {
        btn.classList.add('hidden');
      });

      // 2. Sembunyikan menu Input Presensi di sidebar
      const presensiMenu = document.querySelector('.sidebar-menu a[href="presensi.html"]');
      if (presensiMenu) presensiMenu.classList.add('hidden');
      
    } else {
      // --- AKSI UNTUK USTAZ ---
      
      // Sembunyikan menu Admin (Santri, Rekap, Libur, Kelas, User) di sidebar
      document.querySelectorAll(
        '.sidebar-menu a[href="santri.html"], ' +
        '.sidebar-menu a[href="rekap.html"], ' +
        '.sidebar-menu a[href="libur.html"], ' +
        '.sidebar-menu a[href="kelas.html"], ' +
        '.sidebar-menu a[href="users.html"]'
      ).forEach(el => {
        el.classList.add('hidden');
      });
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
