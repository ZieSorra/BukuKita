import { getMemberById, listMembers } from '../lib/services/members.js';

const memberTypeLabels = {
  siswa: 'Siswa',
  guru: 'Guru',
  petugas: 'Petugas',
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

function createStatusPill(value, labels) {
  const pill = document.createElement('span');
  pill.className = `member-status-pill ${value === 'active' ? 'is-active' : 'is-inactive'}`;
  pill.textContent = labels[value] ?? value ?? '-';
  return pill;
}

function createMemberRow(member, onDetail) {
  const student = memberStudent(member);
  const row = document.createElement('tr');
  const cells = [
    member.member_code,
    member.profile?.full_name,
    memberTypeLabels[member.member_type] ?? member.member_type,
    member.status,
    member.profile?.status,
    member.member_type === 'siswa' ? student?.nis : '-',
    member.member_type === 'siswa' ? student?.class_name : '-',
    member.member_type === 'siswa' ? student?.academic_year?.name : '-',
  ];

  cells.forEach((value, index) => {
    const cell = document.createElement('td');
    if (index === 3) cell.append(createStatusPill(member.status, statusLabels));
    else if (index === 4) cell.append(createStatusPill(member.profile?.status, statusLabels));
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
  name.textContent = member.profile?.full_name || '-';
  const code = document.createElement('span');
  code.textContent = member.member_code;
  heading.append(name, code);

  const fields = document.createElement('dl');
  fields.append(
    createField('Jenis', memberTypeLabels[member.member_type] ?? member.member_type),
    createField('Status anggota', statusLabels[member.status] ?? member.status),
    createField('Status profile', statusLabels[member.profile?.status] ?? member.profile?.status),
    createField('NIS', member.member_type === 'siswa' ? student?.nis : '-'),
    createField('Kelas', member.member_type === 'siswa' ? student?.class_name : '-'),
  );
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
  const state = { page: 1, pageSize: 20, search: '', memberType: null, status: null, detailId: null };

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
    heading.textContent = error ? 'Detail anggota tidak tersedia.' : member?.profile?.full_name || 'Detail anggota';
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
    details.append(
      createField('Kode anggota', member.member_code),
      createField('Nama', member.profile?.full_name),
      createField('Role profile', member.profile?.role),
      createField('Jenis anggota', memberTypeLabels[member.member_type] ?? member.member_type),
      createField('Status anggota', statusLabels[member.status] ?? member.status),
      createField('Status profile', statusLabels[member.profile?.status] ?? member.profile?.status),
      createField('Tanggal bergabung', formatDate(member.joined_at)),
      createField('NIS', student?.nis),
      createField('Kelas', student?.class_name),
      createField('Tahun akademik', student?.academic_year?.name),
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
    section.append(heading, copy);

    const controls = document.createElement('form');
    controls.className = 'members-controls';
    controls.innerHTML = `
      <label>Cari anggota <input name="search" type="search" placeholder="Kode, nama, atau NIS" /></label>
      <label>Jenis anggota <select name="memberType"><option value="">Semua</option><option value="siswa">Siswa</option><option value="guru">Guru</option><option value="petugas">Petugas</option></select></label>
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
    status.textContent = 'Memuat anggota...';
    section.append(status);
    loadList(status);
  }

  async function loadList(status) {
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
    status.textContent = `${data.total} anggota ditemukan.`;
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'members-table-wrapper';
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Kode Anggota</th><th>Nama</th><th>Jenis Anggota</th><th>Status Anggota</th><th>Status Profile</th><th>NIS</th><th>Kelas</th><th>Tahun Akademik</th><th>Aksi</th></tr></thead>';
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