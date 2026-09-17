import './style.css';
import { isSupabaseConfigured } from './lib/supabase.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="BukuKita beranda">
        <span class="brand-mark" aria-hidden="true">BK</span>
        <span>BukuKita</span>
      </a>
      <span class="environment-pill">Sprint 2A</span>
    </header>

    <section class="welcome" aria-labelledby="welcome-title">
      <p class="eyebrow">Perpustakaan sekolah</p>
      <h1 id="welcome-title">Ruang kerja yang siap bertumbuh.</h1>
      <p class="welcome-copy">
        Fondasi aplikasi BukuKita sudah aktif. Modul operasional akan hadir di sini pada sprint berikutnya.
      </p>
      <div class="status-row" role="status">
        <span class="status-dot ${isSupabaseConfigured ? 'is-ready' : ''}" aria-hidden="true"></span>
        <span>${isSupabaseConfigured ? 'Supabase siap digunakan' : 'Supabase belum dikonfigurasi'}</span>
      </div>
    </section>

    <footer class="footer">
      <span>BUKUKITA</span>
      <span>Fondasi frontend</span>
    </footer>
  </main>
`;