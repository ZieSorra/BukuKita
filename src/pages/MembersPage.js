import {
  createAdminMember,
  createStudentMember,
  getMemberById,
  listAdminProfiles,
  listMembers,
} from '../lib/services/members.js';

const memberTypeLabels = {
  siswa: 'Siswa',
  admin: 'Admin',
};

const statusLabels = {
  active: 'Aktif',
  inactive: 'Nonaktif',
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}

function createField(label, value) {
  const field = document.createElement('div');
  field.className = 'member-detail-field';
  const name = document.createElement('dt');
  name.textContent = label;
  const content = document.createElement('dd');
  content.textContent = value || '-';
  field.append(name, content);
  return field;
}

function memberStudent(member) {
  return Array.isArray(member.student) ? member.student[0] : member.student;
}

function memberName(member) {
  return member.member_type === 'siswa'
    ? memberStudent(member)?.full_name
    : member.profile?.full_name;
}

function createStatusPill(value, labels) {
  const pill = document.createElement('span');
  pill.className = `member-status-pill ${value === 'active' ? 'is-active' : 'is-inactive'}`;
  pill.textContent = labels[value] ?? value ?? '-';
  return pill;
}

function createMemberRow(member, onDetail) {
  const student = memberStudent(member);
  const row = document.createElement('tr');
  const cells = [member.member_code, memberName(member), memberTypeLabels[member.member_type] ?? member.member_type];
  if (member.member_type === 'siswa') cells.push(student?.nis, student?.class_name);
  else cells.push('-', '-');
  cells.push(member.status, member.member_type === 'admin' ? member.profile?.status : '-');

  cells.forEach((value, index) => {
    const cell = document.createElement('td');
    if (index === 5) cell.append(createStatusPill(member.status, statusLabels));
    else if (index === 6 && member.member_type === 'admin') cell.append(createStatusPill(member.profile?.status, statusLabels));
    else cell.textContent = value || '-';
    row.append(cell);
  });

  const actionCell = document.createElement('td');
  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'secondary-button member-detail-button';
  detailButton.textContent = 'Lihat detail';
  detailButton.addEventListener('click', () => onDetail(member.id));
  actionCell.append(detailButton);
  row.append(actionCell);
  return row;
}

function createMemberCard(member, onDetail) {
  const student = memberStudent(member);
  const card = document.createElement('article');
  card.className = 'member-card';
  const heading = document.createElement('div');
  heading.className = 'member-card-heading';
  const name = document.createElement('strong');
  name.textContent = memberName(member) || '-';
  const code = document.createElement('span');
  code.textContent = member.member_code;
  heading.append(name, code);

  const fields = document.createElement('dl');
  fields.append(createField('Jenis', memberTypeLabels[member.member_type] ?? member.member_type));
  if (member.member_type === 'siswa') {
    fields.append(createField('NIS', student?.nis), createField('Kelas', student?.class_name));
  }
  fields.append(createField('Status anggota', statusLabels[member.status] ?? member.status));
  if (member.member_type === 'admin') fields.append(createField('Status akun', statusLabels[member.profile?.status] ?? member.profile?.status));
  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'secondary-button';
  detailButton.textContent = 'Lihat detail';
  detailButton.addEventListener('click', () => onDetail(member.id));
  card.append(heading, fields, detailButton);
  return card;
}

function createPagination(page, pageSize, total, onPageChange) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const navigation = document.createElement('nav');
  navigation.className = 'member-pagination';
  navigation.setAttribute('aria-label', 'Pagination anggota');

  for (let number = 1; number <= totalPages; number += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = number === page ? 'is-current' : '';
    button.textContent = String(number);
    button.setAttribute('aria-label', `Halaman ${number}`);
    if (number === page) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => onPageChange(number));
    navigation.append(button);
  }
  return navigation;
}

export function createMembersPage(profile) {
  const section = document.createElement('section');
  section.className = 'page-section members-page';
  section.setAttribute('aria-labelledby', 'members-title');
  const state = {
    page: 1,
    pageSize: 20,
    search: '',
    memberType: null,
    status: null,
    detailId: null,
    modalOpen: false,
    notice: '',
  };

  function closeCreateDialog() {
    state.modalOpen = false;
    section.querySelector('.member-create-dialog')?.remove();
  }

  function appendFormField(form, labelText, input) {
    const label = document.createElement('label');
    label.append(labelText, input);
    form.append(label);
    return input;
  }

  function createCreateDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'member-create-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'member-create-title');

    const panel = document.createElement('div');
    panel.className = 'member-create-panel';
    const heading = document.createElement('h2');
    heading.id = 'member-create-title';
    heading.textContent = 'Tambah Anggota';
    panel.append(heading);

    const typeForm = document.createElement('form');
    typeForm.className = 'member-create-type';
    const typeSelect = document.createElement('select');
    typeSelect.name = 'memberType';
    typeSelect.innerHTML = '<option value="siswa">Siswa</option><option value="admin">Admin</option>';
    appendFormField(typeForm, 'Jenis anggota', typeSelect);
    panel.append(typeForm);

    const form = document.createElement('form');
    form.className = 'member-create-form';
    form.noValidate = true;
    const feedback = document.createElement('p');
    feedback.className = 'member-create-feedback';
    feedback.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'member-create-actions';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'secondary-button';
    cancelButton.textContent = 'Batal';
    cancelButton.addEventListener('click', closeCreateDialog);
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Simpan';
    actions.append(cancelButton, submitButton);
    let profileRequestId = 0;

    function setFeedback(message, type = '') {
      feedback.className = `member-create-feedback${type ? ` ${type}` : ''}`;
      feedback.textContent = message;
    }

    function renderStudentForm() {
      form.innerHTML = '';
      setFeedback('');
      submitButton.disabled = false;
      const fullName = document.createElement('input');
      fullName.name = 'fullName';
      fullName.required = true;
      appendFormField(form, 'Nama lengkap *', fullName);
      const nis = document.createElement('input');
      nis.name = 'nis';
      nis.required = true;
      appendFormField(form, 'NIS *', nis);
      const className = document.createElement('input');
      className.name = 'className';
      appendFormField(form, 'Kelas', className);
      const academicYearId = document.createElement('input');
      academicYearId.name = 'academicYearId';
      appendFormField(form, 'Tahun akademik', academicYearId);
      const joinedAt = document.createElement('input');
      joinedAt.name = 'joinedAt';
      joinedAt.type = 'date';
      appendFormField(form, 'Tanggal bergabung', joinedAt);
      form.append(feedback, actions);
    }

    async function renderAdminForm() {
      const currentRequestId = ++profileRequestId;
      form.innerHTML = '';
      submitButton.disabled = true;
      setFeedback('Memuat kandidat profile admin...', 'loading');
      form.append(feedback, actions);

      const { data, error } = await listAdminProfiles();
      if (currentRequestId !== profileRequestId || typeSelect.value !== 'admin') return;
      if (error) {
        setFeedback(error.message || 'Kandidat profile admin gagal dimuat.', 'error');
        return;
      }
      if (!data?.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'member-create-dependency';
        emptyState.textContent = 'Belum ada profile admin aktif yang tersedia sebagai member.';
        form.innerHTML = '';
        form.append(emptyState, feedback, actions);
        setFeedback('Pilih jenis anggota lain atau batalkan.', '');
        return;
      }

      form.innerHTML = '';
      const profileSelect = document.createElement('select');
      profileSelect.name = 'profileId';
      profileSelect.required = true;
      profileSelect.innerHTML = '<option value="">Pilih profile admin</option>';
      data.forEach(({ id, full_name: fullName }) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = fullName;
        profileSelect.append(option);
      });
      appendFormField(form, 'Profile admin *', profileSelect);
      const joinedAt = document.createElement('input');
      joinedAt.name = 'joinedAt';
      joinedAt.type = 'date';
      appendFormField(form, 'Tanggal bergabung', joinedAt);
      submitButton.disabled = false;
      form.append(feedback, actions);
    }

    function renderForm() {
      if (typeSelect.value === 'admin') renderAdminForm();
      else {
        profileRequestId += 1;
        renderStudentForm();
      }
    }

    typeSelect.addEventListener('change', renderForm);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submitButton.disabled = true;
      cancelButton.disabled = true;
      const isAdmin = typeSelect.value === 'admin';
      setFeedback(`Menyimpan anggota ${isAdmin ? 'admin' : 'siswa'}...`, 'loading');
      const result = isAdmin
        ? await createAdminMember({
          profileId: form.elements.profileId.value,
          joinedAt: form.elements.joinedAt.value || null,
        })
        : await createStudentMember({
          fullName: form.elements.fullName.value.trim(),
          nis: form.elements.nis.value.trim(),
          className: form.elements.className.value.trim() || null,
          academicYearId: form.elements.academicYearId.value.trim() || null,
          joinedAt: form.elements.joinedAt.value || null,
        });
      const { error } = result;
      cancelButton.disabled = false;
      if (error) {
        submitButton.disabled = false;
        setFeedback(error.message || 'Anggota gagal disimpan.', 'error');
        return;
      }
      if (isAdmin) await listAdminProfiles();
      state.notice = `Anggota ${isAdmin ? 'admin' : 'siswa'} berhasil disimpan.`;
      closeCreateDialog();
      renderList();
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'member-create-close secondary-button';
    closeButton.textContent = 'Tutup';
    closeButton.addEventListener('click', closeCreateDialog);
    panel.append(closeButton, form);
    dialog.append(panel);
    renderForm();
    return dialog;
  }

  function openCreateDialog() {
    if (state.modalOpen) return;
    state.modalOpen = true;
    section.append(createCreateDialog());
  }

  function renderDetail(member, error = null) {
    section.innerHTML = '';
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'secondary-button member-back-button';
    backButton.textContent = 'Kembali ke daftar';
    backButton.addEventListener('click', () => {
      state.detailId = null;
      renderList();
    });
    section.append(backButton);

    const heading = document.createElement('h1');
    heading.id = 'members-title';
    heading.textContent = error ? 'Detail anggota tidak tersedia.' : memberName(member) || 'Detail anggota';
    section.append(heading);
    if (error) {
      const message = document.createElement('p');
      message.className = 'members-status error';
      message.setAttribute('role', 'alert');
      message.textContent = error.message || 'Detail anggota gagal dimuat.';
      section.append(message);
      return;
    }
    if (!member) return;

    const student = memberStudent(member);
    const details = document.createElement('dl');
    details.className = 'member-detail-grid';
    details.append(createField('Kode anggota', member.member_code), createField('Nama', memberName(member)));
    if (member.member_type === 'siswa') {
      details.append(
        createField('NIS', student?.nis),
        createField('Kelas', student?.class_name),
        createField('Tahun akademik', student?.academic_year?.name),
      );
    } else {
      details.append(createField('Role', member.profile?.role), createField('Status akun', statusLabels[member.profile?.status] ?? member.profile?.status));
    }
    details.append(
      createField('Jenis anggota', memberTypeLabels[member.member_type] ?? member.member_type),
      createField('Status anggota', statusLabels[member.status] ?? member.status),
      createField('Tanggal bergabung', formatDate(member.joined_at)),
    );
    section.append(details);
  }

  async function showDetail(memberId) {
    state.detailId = memberId;
    section.innerHTML = '';
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'secondary-button member-back-button';
    backButton.textContent = 'Kembali ke daftar';
    backButton.addEventListener('click', () => {
      state.detailId = null;
      renderList();
    });
    const loading = document.createElement('p');
    loading.className = 'members-status';
    loading.setAttribute('role', 'status');
    loading.textContent = 'Memuat detail anggota...';
    section.append(backButton, loading);
    const { data, error } = await getMemberById(memberId);
    if (state.detailId !== memberId) return;
    renderDetail(data, error ?? (!data ? new Error('Anggota tidak ditemukan.') : null));
  }

  function renderList() {
    section.innerHTML = '';
    const heading = document.createElement('h1');
    heading.id = 'members-title';
    heading.textContent = 'Anggota';
    const copy = document.createElement('p');
    copy.className = 'page-copy';
    copy.textContent = `Data anggota untuk ${profile.role}.`;
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'member-add-button';
    addButton.textContent = 'Tambah Anggota';
    addButton.addEventListener('click', openCreateDialog);
    section.append(heading, copy, addButton);

    const controls = document.createElement('form');
    controls.className = 'members-controls';
    controls.innerHTML = `
      <label>Cari anggota <input name="search" type="search" placeholder="Kode, nama, atau NIS" /></label>
      <label>Jenis anggota <select name="memberType"><option value="">Semua</option><option value="siswa">Siswa</option><option value="admin">Admin</option></select></label>
      <label>Status anggota <select name="status"><option value="">Semua</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
      <button type="submit">Terapkan</button>
    `;
    controls.elements.search.value = state.search;
    controls.elements.memberType.value = state.memberType ?? '';
    controls.elements.status.value = state.status ?? '';
    controls.addEventListener('submit', (event) => {
      event.preventDefault();
      state.search = controls.elements.search.value.trim();
      state.memberType = controls.elements.memberType.value || null;
      state.status = controls.elements.status.value || null;
      state.page = 1;
      renderList();
    });
    section.append(controls);

    const status = document.createElement('p');
    status.className = 'members-status';
    status.setAttribute('role', 'status');
    status.textContent = state.notice || 'Memuat anggota...';
    section.append(status);
    const notice = state.notice;
    state.notice = '';
    loadList(status, notice);
  }

  async function loadList(status, notice = '') {
    const { data, error } = await listMembers(state);
    if (error) {
      status.className = 'members-status error';
      status.setAttribute('role', 'alert');
      status.textContent = error.message || 'Data anggota gagal dimuat.';
      return;
    }
    if (!data.items.length) {
      status.className = 'members-status empty';
      status.textContent = 'Belum ada data anggota yang sesuai.';
      return;
    }
    status.className = 'members-status success';
    status.textContent = notice ? `${notice} ${data.total} anggota ditemukan.` : `${data.total} anggota ditemukan.`;
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'members-table-wrapper';
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>NIS</th><th>Kelas</th><th>Status Anggota</th><th>Status Akun</th><th>Aksi</th></tr></thead>';
    const body = document.createElement('tbody');
    data.items.forEach((member) => body.append(createMemberRow(member, showDetail)));
    table.append(body);
    tableWrapper.append(table);
    section.append(tableWrapper);

    const cards = document.createElement('div');
    cards.className = 'members-cards';
    data.items.forEach((member) => cards.append(createMemberCard(member, showDetail)));
    section.append(cards);
    const pagination = createPagination(data.page, data.pageSize, data.total, (page) => {
      state.page = page;
      renderList();
    });
    if (pagination) section.append(pagination);
  }

  renderList();
  return section;
}