import { auth } from './auth.js';
import { getCurrentProfile } from './profile.js';

const validRoles = new Set(['admin', 'petugas', 'guru', 'siswa']);

let state = {
  status: 'loading',
  session: null,
  profile: null,
  error: null,
};
let initialized = false;
let requestId = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(state));
}

function isSameUser(session) {
  return session?.user?.id && session.user.id === state.session?.user?.id;
}

async function applySession(session) {
  if (!session) {
    requestId += 1;
    state = { status: 'unauthenticated', session: null, profile: null, error: null };
    emit();
    return;
  }

  if (isSameUser(session) && ['profile-loading', 'authenticated', 'blocked'].includes(state.status)) {
    return;
  }

  const currentRequestId = ++requestId;
  state = { status: 'profile-loading', session, profile: null, error: null };
  emit();

  const { profile, error } = await getCurrentProfile();
  if (currentRequestId !== requestId) {
    return;
  }

  if (error || !profile || !validRoles.has(profile.role)) {
    state = {
      status: 'blocked',
      session,
      profile: null,
      error: error ?? new Error('Role profile tidak valid.'),
    };
    emit();
    return;
  }

  state = { status: 'authenticated', session, profile, error: null };
  emit();
}

export const sessionStore = {
  getState() {
    return state;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async initialize() {
    if (initialized) {
      return;
    }

    initialized = true;
    auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    const { session, error } = await auth.getSession();
    if (error) {
      requestId += 1;
      state = { status: 'error', session: null, profile: null, error };
      emit();
      return;
    }

    await applySession(session);
  },

  async signIn(email, password) {
    return auth.signIn(email, password);
  },

  async signOut() {
    return auth.signOut();
  },
};