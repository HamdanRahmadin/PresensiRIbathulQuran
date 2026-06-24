// ============================================================
// Libur - Logic Kelola Hari Libur
// ============================================================

let deleteLiburTarget = { tanggal: '', sesi: '' };

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  initLibur();
});

function initLibur() {
  // Set default tanggal ke hari ini
  document.getElementById('liburTanggal').value = formatDate(new Date());

  // Setup form
  document.getElementById('liburForm').addEventListener('submit', handleAddLibur);

  loadLibur();
}

async function loadLibur() {
  document.getElementById('liburLoading').classList.remove('hidden');
  document.getElementById('liburList').innerHTML = '';

  const result = await API.getLibur();

  document.getElementById('liburLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('liburList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data: ${result.message}</div>
      </div>
    `;
    return;
  }

  const data = result.data;

  if (data.length === 0) {
    document.getElementById('liburList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128197;</div>
        <div class="empty-text">Belum ada hari libur khusus yang ditambahkan</div>
      </div>
    `;
    return;
  }

  let html = '';
  data.forEach(l => {
    const displayDate = formatDisplayDate(l.tanggal);
    const sesiText = l.sesi === 'Semua' ? 'Pagi & Malam' : 'Sesi ' + l.sesi;

    html += `
      <div class="libur-item">
        <div class="libur-info">
          <div class="libur-date">${displayDate}</div>
          <div class="libur-sesi">${sesiText}</div>
          <div class="libur-desc">${l.keterangan}</div>
        </div>
        <button class="btn-icon delete" onclick="showDeleteModal('${l.tanggal}', '${l.sesi}', '${escapeQuote(l.keterangan)}')" title="Hapus">&#128465;</button>
      </div>
    `;
  });

  document.getElementById('liburList').innerHTML = html;
}

async function handleAddLibur(e) {
  e.preventDefault();

  const tanggal = document.getElementById('liburTanggal').value;
  const sesi = document.getElementById('liburSesi').value;
  const keterangan = document.getElementById('liburKeterangan').value.trim();
  const btn = document.getElementById('btnAddLibur');

  if (!tanggal || !keterangan) {
    showToast('Lengkapi semua field', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const result = await API.addLibur(tanggal, sesi, keterangan);

  btn.disabled = false;
  btn.textContent = 'Tambah Hari Libur';

  if (result.success) {
    showToast(result.message, 'success');
    document.getElementById('liburKeterangan').value = '';
    loadLibur();
  } else {
    showToast(result.message || 'Gagal menambahkan hari libur', 'error');
  }
}

function showDeleteModal(tanggal, sesi, keterangan) {
  deleteLiburTarget = { tanggal, sesi };
  const displayDate = formatDisplayDate(tanggal);
  document.getElementById('deleteInfo').textContent = `${displayDate} - ${keterangan}`;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
  const btn = document.getElementById('btnDelete');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  const result = await API.deleteLibur(deleteLiburTarget.tanggal, deleteLiburTarget.sesi);

  btn.disabled = false;
  btn.textContent = 'Hapus';

  if (result.success) {
    showToast(result.message, 'success');
    closeDeleteModal();
    loadLibur();
  } else {
    showToast(result.message || 'Gagal menghapus', 'error');
  }
}

function escapeQuote(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
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
