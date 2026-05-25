type SessionUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

export type ClientSession = {
  user?: SessionUser;
};

let cachedSession: ClientSession | null = null;
let cachedAt = 0;
let inflightSessionPromise: Promise<ClientSession> | null = null;

const SESSION_TTL_MS = 30_000;

export async function getClientSession(options?: { force?: boolean }) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && cachedSession && now - cachedAt < SESSION_TTL_MS) {
    return cachedSession;
  }

  if (!force && inflightSessionPromise) {
    return inflightSessionPromise;
  }

  inflightSessionPromise = fetch("/api/auth/session", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return {};
      return (await response.json()) as ClientSession;
    })
    .catch(() => ({} as ClientSession))
    .then((session) => {
      cachedSession = session;
      cachedAt = Date.now();
      return session;
    })
    .finally(() => {
      inflightSessionPromise = null;
    });

  return inflightSessionPromise;
}

export function clearClientSessionCache() {
  cachedSession = null;
  cachedAt = 0;
}

