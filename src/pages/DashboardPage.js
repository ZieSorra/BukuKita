import { getDashboardSummary } from '../lib/services/dashboard.js';

const operationalMetrics = [
  ['activeBooks', 'Buku Aktif'],
  ['availableCopies', 'Copy Tersedia'],
  ['borrowedCopies', 'Copy Dipinjam'],
  ['ongoingBorrowings', 'Peminjaman Berjalan'],
  ['overdueBorrowings', 'Peminjaman Terlambat'],
  ['activeMembers', 'Anggota Aktif'],
];

const personalMetrics = [
  ['myActiveBorrowings', 'Peminjaman Aktif Saya'],
  ['myOverdueBorrowings', 'Peminjaman Terlambat Saya'],
  ['myTotalBorrowings', 'Total Peminjaman Saya'],
  ['myBorrowedItems', 'Buku Masih Dipinjam'],
];

function createMetricCard(label) {
  const card = document.createElement('article');
  card.className = 'dashboard-metric';

  const value = document.createElement('strong');
  value.className = 'dashboard-metric-value';
  value.textContent = '0';

  const name = document.createElement('span');
  name.className = 'dashboard-metric-label';
  name.textContent = label;

  card.append(value, name);
  return { card, value };
}

function createDashboardMetrics(profile) {
  const metrics = document.createElement('div');
  metrics.className = 'dashboard-metrics';

  const metricDefinitions = ['admin', 'petugas'].includes(profile.role)
    ? operationalMetrics
    : personalMetrics;
  const metricElements = new Map();

  metricDefinitions.forEach(([key, label]) => {
    const metric = createMetricCard(label);
    metricElements.set(key, metric.value);
    metrics.append(metric.card);
  });

  return { metrics, metricElements };
}

function updateMetrics(metricElements, summary) {
  metricElements.forEach((valueElement, key) => {
    valueElement.textContent = String(summary[key] ?? 0);
  });
}

export function createDashboardPage(profile) {
  const section = document.createElement('section');
  section.className = 'page-section dashboard-page';
  section.setAttribute('aria-labelledby', 'dashboard-title');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Ruang kerja BukuKita';

  const heading = document.createElement('h1');
  heading.id = 'dashboard-title';
  heading.textContent = `Selamat datang, ${profile.full_name}.`;

  const copy = document.createElement('p');
  copy.className = 'page-copy';
  copy.textContent = 'Ringkasan aktivitas perpustakaan Anda hari ini.';

  const status = document.createElement('p');
  status.className = 'dashboard-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Memuat ringkasan...';

  const { metrics, metricElements } = createDashboardMetrics(profile);

  async function loadSummary() {
    const { summary, error } = await getDashboardSummary(profile);

    if (error || !summary) {
      status.className = 'dashboard-status error';
      status.setAttribute('role', 'alert');
      status.textContent = 'Ringkasan belum dapat dimuat. Silakan coba lagi nanti.';
      return;
    }

    updateMetrics(metricElements, summary);
    status.className = 'dashboard-status success';
    status.setAttribute('role', 'status');
    status.textContent = 'Ringkasan berhasil diperbarui.';
  }

  section.append(eyebrow, heading, copy, status, metrics);
  loadSummary();
  return section;
}