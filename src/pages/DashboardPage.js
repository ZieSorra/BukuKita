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
  copy.textContent = 'Dashboard awal siap digunakan. Modul operasional akan hadir pada sprint berikutnya.';

  section.append(eyebrow, heading, copy);
  return section;
}