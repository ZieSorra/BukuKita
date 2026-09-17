import { createHeader } from './Header.js';
import { createSidebar } from './Sidebar.js';
import { createDashboardPage } from '../pages/DashboardPage.js';
import { getNavigationForRole, getRoute, isRouteAllowed } from '../navigation/navigation.js';

function createMessagePage(title, message, type = '') {
  const section = document.createElement('section');
  section.className = `page-section message-page ${type}`;
  section.setAttribute('aria-live', 'polite');

  const heading = document.createElement('h1');
  heading.textContent = title;

  const copy = document.createElement('p');
  copy.className = 'page-copy';
  copy.textContent = message;

  section.append(heading, copy);
  return section;
}

function createPageContent(path, profile) {
  const route = getRoute(path);
  if (!route) {
    return createMessagePage('Halaman tidak tersedia.', 'Route yang diminta belum tersedia.', 'error');
  }

  if (!isRouteAllowed(path, profile.role)) {
    return createMessagePage('Akses tidak tersedia.', 'Halaman ini tidak tersedia untuk role Anda.', 'error');
  }

  if (path === '/dashboard') {
    return createDashboardPage(profile);
  }

  return createMessagePage(route.title, 'Modul ini akan tersedia pada sprint berikutnya.', 'empty');
}

export function createAppShell({ profile, currentPath, isDrawerOpen, onNavigate, onMenuClick, onClose, onLogout }) {
  const shell = document.createElement('div');
  shell.className = 'app-shell app-shell-authenticated';

  const navigation = getNavigationForRole(profile.role);
  const route = getRoute(currentPath);
  const title = route?.title ?? 'BukuKita';

  const sidebar = createSidebar({
    items: navigation,
    currentPath,
    isOpen: isDrawerOpen,
    onNavigate,
    onClose,
  });
  const content = document.createElement('div');
  content.className = 'app-content';
  content.append(
    createHeader({ profile, title, onMenuClick, onLogout }),
    createPageContent(currentPath, profile),
  );

  shell.append(sidebar, content);
  return shell;
}