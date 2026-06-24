// ============================================================
// Auth - Autentikasi Sederhana
// ============================================================

const Auth = {
  isLoggedIn() {
    return sessionStorage.getItem('loggedIn') === 'true';
  },

  setLoggedIn() {
    sessionStorage.setItem('loggedIn', 'true');
  },

  logout() {
    sessionStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
  },

  // Cek di setiap halaman (kecuali login)
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};
