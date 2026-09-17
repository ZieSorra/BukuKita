import './style.css';
import { createAppShell } from './components/AppShell.js';
import { sessionStore } from './lib/session.js';

const app = document.querySelector('#app');
let currentPath = window.location.pathname;
let isDrawerOpen = false;
let latestState = sessionStore.getState();
let redirectAfterLogin = false;

function normalizePath(pathname) {
  if (pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/$/, '') || '/';
}

function navigate(path) {
  if (currentPath === path) {
    isDrawerOpen = false;
    render();
    return;
  }

  window.history.pushState({}, '', path);
  currentPath = path;
  isDrawerOpen = false;
  render();
}

function createStatusPage(title, message, type = '') {
  const section = document.createElement('section');
  section.className = `standalone-page ${type}`;
  section.setAttribute('aria-live', 'polite');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Perpustakaan sekolah';

  const heading = document.createElement('h1');
  heading.textContent = title;

  const copy = document.createElement('p');
  copy.className = 'page-copy';
  copy.textContent = message;

  section.append(eyebrow, heading, copy);
  return section;
}

function createLoginPage(errorMessage = '') {
  const section = createStatusPage('Masuk ke BukuKita.', 'Gunakan akun yang terdaftar untuk melanjutkan ke ruang kerja perpustakaan.');
  section.className = 'standalone-page login-page';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.noValidate = true;
  form.innerHTML = `
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" required />
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required />
    <button type="submit">Masuk</button>
  `;

  if (errorMessage) {
    const feedback = document.createElement('p');
    feedback.className = 'feedback error';
    feedback.setAttribute('role', 'alert');
    feedback.textContent = errorMessage;
    form.append(feedback);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const button = form.querySelector('button');

    if (!email || !password) {
      render(currentPath, 'Email dan password wajib diisi.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Memproses...';
    redirectAfterLogin = true;
    const { error } = await sessionStore.signIn(email, password);
    if (error) {
      redirectAfterLogin = false;
      render('/', 'Email atau password tidak valid.');
    }
  });

  section.append(form);
  return section;
}

function createBlockedPage(state) {
  const message = state.error?.message ?? 'Profile user tidak dapat digunakan.';
  const section = createStatusPage('Akses diblokir.', message, 'error');
  const logoutButton = document.createElement('button');
  logoutButton.type = 'button';
  logoutButton.textContent = 'Keluar';
  logoutButton.addEventListener('click', () => sessionStore.signOut());
  section.append(logoutButton);
  return section;
}

function render(path = currentPath, feedback = '') {
  if (path !== currentPath) {
    currentPath = path;
  }

  app.innerHTML = '';
  const state = latestState;

  if (state.status === 'loading' || state.status === 'profile-loading') {
    app.append(createStatusPage('Memeriksa sesi', 'Menyiapkan ruang kerja BukuKita...'));
    return;
  }

  if (state.status === 'blocked') {
    app.append(createBlockedPage(state));
    return;
  }

  if (state.status === 'error') {
    app.append(createStatusPage('Sesi tidak tersedia', 'Sesi tidak dapat diperiksa. Silakan muat ulang halaman.', 'error'));
    return;
  }

  if (state.status === 'unauthenticated') {
    app.append(createLoginPage(feedback));
    return;
  }

  if (currentPath === '/') {
    navigate('/dashboard');
    return;
  }

  app.append(createAppShell({
    profile: state.profile,
    currentPath,
    isDrawerOpen,
    onNavigate: navigate,
    onMenuClick: () => {
      isDrawerOpen = true;
      render();
    },
    onClose: () => {
      isDrawerOpen = false;
      render();
    },
    onLogout: async () => {
      await sessionStore.signOut();
    },
  }));
}

function handlePopState() {
  currentPath = normalizePath(window.location.pathname);
  isDrawerOpen = false;
  render();
}

function handleKeyDown(event) {
  if (event.key === 'Escape' && isDrawerOpen) {
    isDrawerOpen = false;
    render();
  }
}

sessionStore.subscribe((state) => {
  latestState = state;
  if (state.status === 'authenticated' && (redirectAfterLogin || currentPath === '/')) {
    redirectAfterLogin = false;
    navigate('/dashboard');
    return;
  }
  render();
});

window.addEventListener('popstate', handlePopState);
window.addEventListener('keydown', handleKeyDown);

currentPath = normalizePath(window.location.pathname);
render();
sessionStore.initialize();
