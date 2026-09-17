import './style.css';
import { auth } from './lib/auth.js';

const app = document.querySelector('#app');

let currentSession = null;
let viewState = 'loading';
let feedback = null;

function render() {
  app.innerHTML = '';

  const shell = document.createElement('main');
  shell.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = `
    <a class="brand" href="/" aria-label="BukuKita beranda">
      <span class="brand-mark" aria-hidden="true">BK</span>
      <span>BukuKita</span>
    </a>
    <span class="environment-pill">Authentication</span>
  `;
  shell.append(header);

  if (viewState === 'loading') {
    shell.append(createStatusSection('Memeriksa sesi', 'Menyiapkan ruang kerja BukuKita...'));
  } else if (viewState === 'authenticated' && currentSession?.user) {
    shell.append(createAuthenticatedSection(currentSession.user));
  } else if (viewState === 'configuration-error') {
    shell.append(createStatusSection('Konfigurasi diperlukan', feedback.message, 'error'));
  } else {
    shell.append(createLoginSection());
  }

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = '<span>BUKUKITA</span><span>Fondasi autentikasi</span>';
  shell.append(footer);
  app.append(shell);
}

function createStatusSection(title, message, type = '') {
  const section = document.createElement('section');
  section.className = `welcome status-page ${type}`;
  section.setAttribute('aria-live', 'polite');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Perpustakaan sekolah';

  const heading = document.createElement('h1');
  heading.textContent = title;

  const copy = document.createElement('p');
  copy.className = 'welcome-copy';
  copy.textContent = message;

  section.append(eyebrow, heading, copy);
  return section;
}

function createLoginSection() {
  const section = document.createElement('section');
  section.className = 'welcome auth-section';
  section.setAttribute('aria-labelledby', 'login-title');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Perpustakaan sekolah';

  const heading = document.createElement('h1');
  heading.id = 'login-title';
  heading.textContent = 'Masuk ke BukuKita.';

  const copy = document.createElement('p');
  copy.className = 'welcome-copy';
  copy.textContent = 'Gunakan akun yang terdaftar untuk melanjutkan ke ruang kerja perpustakaan.';

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

  if (feedback) {
    const feedbackElement = document.createElement('p');
    feedbackElement.className = `feedback ${feedback.type}`;
    feedbackElement.setAttribute('role', feedback.type === 'error' ? 'alert' : 'status');
    feedbackElement.textContent = feedback.message;
    form.append(feedbackElement);
  }

  form.addEventListener('submit', handleSignIn);
  section.append(eyebrow, heading, copy, form);
  return section;
}

function createAuthenticatedSection(user) {
  const section = document.createElement('section');
  section.className = 'welcome auth-section';
  section.setAttribute('aria-labelledby', 'authenticated-title');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Autentikasi berhasil';

  const heading = document.createElement('h1');
  heading.id = 'authenticated-title';
  heading.textContent = 'Selamat datang kembali.';

  const copy = document.createElement('p');
  copy.className = 'welcome-copy';
  copy.textContent = 'Sesi Supabase aktif. Modul aplikasi akan tersedia pada sprint berikutnya.';

  const userPanel = document.createElement('div');
  userPanel.className = 'user-panel';
  userPanel.innerHTML = '<span class="user-label">Akun aktif</span>';
  const email = document.createElement('strong');
  email.textContent = user.email || 'Email tidak tersedia';
  userPanel.append(email);

  const logoutButton = document.createElement('button');
  logoutButton.className = 'secondary-button';
  logoutButton.type = 'button';
  logoutButton.textContent = 'Keluar';
  logoutButton.addEventListener('click', handleSignOut);

  if (feedback) {
    const feedbackElement = document.createElement('p');
    feedbackElement.className = `feedback ${feedback.type}`;
    feedbackElement.setAttribute('role', feedback.type === 'error' ? 'alert' : 'status');
    feedbackElement.textContent = feedback.message;
    section.append(feedbackElement);
  }

  section.append(eyebrow, heading, copy, userPanel, logoutButton);
  return section;
}

async function handleSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  if (!email || !password) {
    feedback = { type: 'error', message: 'Email dan password wajib diisi.' };
    render();
    return;
  }

  setLoading(form, true);
  feedback = null;
  const { error } = await auth.signIn(email, password);

  if (error) {
    setLoading(form, false);
    feedback = { type: 'error', message: 'Email atau password tidak valid.' };
    render();
  }
}

async function handleSignOut() {
  viewState = 'loading';
  feedback = null;
  render();
  const { error } = await auth.signOut();

  if (error) {
    viewState = 'authenticated';
    feedback = { type: 'error', message: 'Gagal keluar. Silakan coba lagi.' };
    render();
  }
}

function setLoading(form, isLoading) {
  const button = form.querySelector('button');
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Memproses...' : 'Masuk';
}

async function initializeAuth() {
  if (!auth.isConfigured) {
    viewState = 'configuration-error';
    feedback = { message: 'Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY ke file .env.' };
    render();
    return;
  }

  auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    viewState = session ? 'authenticated' : 'unauthenticated';
    feedback = null;
    render();
  });

  const { session, error } = await auth.getSession();
  if (error) {
    viewState = 'unauthenticated';
    feedback = { type: 'error', message: 'Sesi tidak dapat diperiksa. Silakan coba lagi.' };
  } else {
    currentSession = session;
    viewState = session ? 'authenticated' : 'unauthenticated';
  }
  render();
}

render();
initializeAuth();