export function createSidebar({ items, currentPath, isOpen, onNavigate, onClose }) {
  const layer = document.createElement('div');
  layer.className = `sidebar-layer${isOpen ? ' is-open' : ''}`;

  const overlay = document.createElement('button');
  overlay.className = 'sidebar-overlay';
  overlay.type = 'button';
  overlay.setAttribute('aria-label', 'Tutup menu navigasi');
  overlay.addEventListener('click', onClose);

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.setAttribute('aria-label', 'Navigasi utama');

  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'sidebar-header';
  sidebarHeader.innerHTML = '<span class="brand-mark" aria-hidden="true">BK</span><strong>BukuKita</strong>';

  const closeButton = document.createElement('button');
  closeButton.className = 'sidebar-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Tutup menu navigasi');
  closeButton.textContent = 'Tutup';
  closeButton.addEventListener('click', onClose);
  sidebarHeader.append(closeButton);

  const nav = document.createElement('nav');
  nav.className = 'sidebar-nav';
  items.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.path;
    link.className = item.path === currentPath ? 'is-active' : '';
    link.textContent = item.title;
    if (item.path === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
    link.addEventListener('click', (event) => {
      event.preventDefault();
      onNavigate(item.path);
    });
    nav.append(link);
  });

  sidebar.append(sidebarHeader, nav);
  layer.append(overlay, sidebar);
  return layer;
}