const routes = {
  '/dashboard': {
    title: 'Dashboard',
    roles: ['admin', 'petugas', 'guru', 'siswa'],
  },
  '/books': {
    title: 'Buku',
    roles: ['admin', 'petugas'],
  },
  '/members': {
    title: 'Anggota',
    roles: ['admin', 'petugas'],
  },
  '/borrowings': {
    title: 'Peminjaman',
    roles: ['admin', 'petugas'],
  },
  '/returns': {
    title: 'Pengembalian',
    roles: ['admin', 'petugas'],
  },
  '/reports': {
    title: 'Laporan',
    roles: ['admin', 'petugas'],
  },
  '/catalog': {
    title: 'Katalog Buku',
    roles: ['guru', 'siswa'],
  },
  '/my-borrowings': {
    title: 'Peminjaman Saya',
    roles: ['guru', 'siswa'],
  },
};

export function getNavigationForRole(role) {
  return Object.entries(routes)
    .filter(([, route]) => route.roles.includes(role))
    .map(([path, route]) => ({ path, title: route.title }));
}

export function getRoute(path) {
  return routes[path] ?? null;
}

export function isRouteAllowed(path, role) {
  return Boolean(routes[path]?.roles.includes(role));
}