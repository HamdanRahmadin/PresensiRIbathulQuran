// ============================================================
// Users - Logic Kelola Akun (Admin Only)
// ============================================================

let editUserMode = false;
let oldUsername = '';
let deleteUserTarget = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  if (!Auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }
  initUsers();
});

function initUsers() {
  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // Render Kelas dropdown
  renderKelasOptions('inputUserKelas');

  const btnAddUser = document.getElementById('btnAddUser');
  if (btnAddUser) btnAddUser.addEventListener('click', showAddModal);

  const btnCancelUser = document.getElementById('btnCancelUser');
  if (btnCancelUser) btnCancelUser.addEventListener('click', closeUserModal);

  const btnCancelDelete = document.getElementById('btnCancelDeleteUser');
  if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);

  const btnConfirmDelete = document.getElementById('btnConfirmDeleteUser');
  if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', confirmDeleteUser);

  document.getElementById('userForm').addEventListener('submit', handleSubmitUser);

  // Toggle Kelas select based on Role
  document.getElementById('inputRole').addEventListener('change', function() {
    const kelasGroup = document.getElementById('kelasGroup');
    if (this.value === 'admin') {
      kelasGroup.classList.add('hidden');
    } else {
      kelasGroup.classList.remove('hidden');
    }
  });

  loadUsers();
}

async function loadUsers() {
  document.getElementById('usersLoading').classList.remove('hidden');
  document.getElementById('usersList').innerHTML = '';

  const result = await API.getUsers();

  document.getElementById('usersLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('usersList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data akun: ${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  const data = safeArray(result);
  
  if (data.length === 0) {
    document.getElementById('usersList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128100;</div>
        <div class="empty-text">Belum ada akun yang terdaftar</div>
      </div>
    `;
    return;
  }

  const listEl = document.getElementById('usersList');
  listEl.innerHTML = '';

  data.forEach(u => {
    const item = document.createElement('div');
    item.className = 'santri-item'; // Reuse styling

    const info = document.createElement('div');
    info.className = 'santri-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'santri-name';
    nameEl.textContent = u.username;

    const roleEl = document.createElement('div');
    roleEl.className = 'santri-class';
    if (u.role === 'admin') {
      roleEl.innerHTML = '<span class="badge badge-hadir">Admin</span>';
    } else {
      roleEl.textContent = `Ustaz - Kelas ${u.kelas}`;
    }

    info.appendChild(nameEl);
    info.appendChild(roleEl);

    const actions = document.createElement('div');
    actions.className = 'santri-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon edit';
    editBtn.innerHTML = '&#9998;';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => showEditModal(u.username, u.role, u.kelas));

    actions.appendChild(editBtn);

    // Jangan izinkan admin menghapus dirinya sendiri
    const currentUser = Auth.getUser();
    if (u.username !== currentUser.username) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon delete';
      deleteBtn.innerHTML = '&#128465;';
      deleteBtn.title = 'Hapus';
      deleteBtn.addEventListener('click', () => showDeleteModal(u.username));
      actions.appendChild(deleteBtn);
    }

    item.appendChild(info);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
}

function showAddModal() {
  editUserMode = false;
  document.getElementById('modalTitle').textContent = 'Tambah Akun Baru';
  document.getElementById('inputUsername').value = '';
  document.getElementById('inputPassword').value = '';
  document.getElementById('inputPassword').required = true;
  document.getElementById('inputRole').value = 'ustaz';
  
  if (CONFIG.KELAS.length > 0) {
    document.getElementById('inputUserKelas').value = CONFIG.KELAS[0];
  }
  document.getElementById('kelasGroup').classList.remove('hidden');
  
  document.getElementById('btnSubmitUser').textContent = 'Simpan';
  document.getElementById('userModal').classList.remove('hidden');
}

function showEditModal(username, role, kelas) {
  editUserMode = true;
  oldUsername = username;
  document.getElementById('modalTitle').textContent = 'Edit Akun';
  document.getElementById('inputUsername').value = username;
  document.getElementById('inputPassword').value = '';
  document.getElementById('inputPassword').required = false; // Password tak wajib diisi saat edit
  document.getElementById('inputRole').value = role;
  
  if (role === 'admin') {
    document.getElementById('kelasGroup').classList.add('hidden');
  } else {
    document.getElementById('kelasGroup').classList.remove('hidden');
    document.getElementById('inputUserKelas').value = kelas;
  }
  
  document.getElementById('btnSubmitUser').textContent = 'Perbarui';
  document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
}

async function handleSubmitUser(e) {
  e.preventDefault();

  const username = document.getElementById('inputUsername').value.trim();
  const password = document.getElementById('inputPassword').value;
  const role = document.getElementById('inputRole').value;
  const kelas = role === 'admin' ? '' : document.getElementById('inputUserKelas').value;
  
  const btn = document.getElementById('btnSubmitUser');

  if (!username) {
    showToast('Username tidak boleh kosong', 'error');
    return;
  }
  if (!editUserMode && !password) {
    showToast('Password tidak boleh kosong untuk akun baru', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  let result;
  if (editUserMode) {
    result = await API.editUser(oldUsername, username, password, role, kelas);
  } else {
    result = await API.addUser(username, password, role, kelas);
  }

  btn.disabled = false;
  btn.textContent = editUserMode ? 'Perbarui' : 'Simpan';

  if (result.success) {
    showToast(result.message, 'success');
    closeUserModal();
    loadUsers();
  } else {
    showToast(result.message || 'Gagal menyimpan data akun', 'error');
  }
}

function showDeleteModal(username) {
  deleteUserTarget = username;
  document.getElementById('deleteUsername').textContent = username;
  document.getElementById('deleteUserModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteUserModal').classList.add('hidden');
}

async function confirmDeleteUser() {
  const btn = document.getElementById('btnConfirmDeleteUser');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  const result = await API.deleteUser(deleteUserTarget);

  btn.disabled = false;
  btn.textContent = 'Hapus';

  if (result.success) {
    showToast(result.message, 'success');
    closeDeleteModal();
    loadUsers();
  } else {
    showToast(result.message || 'Gagal menghapus akun', 'error');
  }
}
