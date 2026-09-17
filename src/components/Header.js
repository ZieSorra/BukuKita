export function createHeader({ profile, title, onMenuClick, onLogout }) {
  const header = document.createElement('header');
  header.className = 'app-header';

  const menuButton = document.createElement('button');
  menuButton.className = 'menu-button';
  menuButton.type = 'button';
  menuButton.setAttribute('aria-label', 'Buka menu navigasi');
  menuButton.textContent = 'Menu';
  menuButton.addEventListener('click', onMenuClick);

  const titleElement = document.createElement('div');
  titleElement.className = 'header-title';
  titleElement.textContent = title;

  const identity = document.createElement('div');
  identity.className = 'header-identity';

  const name = document.createElement('strong');
  name.textContent = profile.full_name;

  const role = document.createElement('span');
  role.textContent = profile.role;
  identity.append(name, role);

  const logoutButton = document.createElement('button');
  logoutButton.className = 'header-logout';
  logoutButton.type = 'button';
  logoutButton.textContent = 'Keluar';
  logoutButton.addEventListener('click', onLogout);

  header.append(menuButton, titleElement, identity, logoutButton);
  return header;
}