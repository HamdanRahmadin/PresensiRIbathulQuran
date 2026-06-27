// ============================================================
// API Helper - Komunikasi dengan Google Apps Script
// ============================================================

const API = {
  // GET request
  async get(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.append('action', action);
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    }

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        return { success: false, message: `Server error (${response.status})` };
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API GET Error:', error);
      return { success: false, message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.' };
    }
  },

  // POST request
  async post(action, body = {}) {
    const payload = Object.assign({}, body, { action });

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      if (!response.ok) {
        return { success: false, message: `Server error (${response.status})` };
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API POST Error:', error);
      return { success: false, message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.' };
    }
  },

  // Login (menggunakan POST agar password tidak muncul di URL)
  async login(username, password) {
    return await this.post('login', { username, password });
  },

  // ---- SANTRI ----
  async getSantri(kelas = '') {
    return await this.get('getSantri', { kelas });
  },

  async addSantri(nama, kelas) {
    return await this.post('addSantri', { nama, kelas });
  },

  async editSantri(namaLama, kelasLama, nama, kelas) {
    return await this.post('editSantri', { namaLama, kelasLama, nama, kelas });
  },

  async deleteSantri(nama, kelas) {
    return await this.post('deleteSantri', { nama, kelas });
  },

  // ---- PRESENSI ----
  async getPresensi(tanggal, sesi = '', kelas = '') {
    return await this.get('getPresensi', { tanggal, sesi, kelas });
  },

  async getPresensiByDate(tanggal) {
    return await this.get('getPresensiByDate', { tanggal });
  },

  async savePresensi(tanggal, sesi, presensi) {
    return await this.post('savePresensi', { tanggal, sesi, presensi });
  },

  // ---- REKAP ----
  async getRekap(tglMulai, tglAkhir, kelas = '', nama = '') {
    return await this.get('getRekap', { tglMulai, tglAkhir, kelas, nama });
  },

  // ---- LIBUR ----
  async getLibur() {
    return await this.get('getLibur');
  },

  async addLibur(tanggal, sesi, keterangan) {
    return await this.post('addLibur', { tanggal, sesi, keterangan });
  },

  async deleteLibur(tanggal, sesi) {
    return await this.post('deleteLibur', { tanggal, sesi });
  },

  async checkLibur(tanggal, sesi) {
    return await this.get('checkLibur', { tanggal, sesi });
  }
};
