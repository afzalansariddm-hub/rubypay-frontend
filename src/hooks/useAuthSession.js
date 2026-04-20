import { useEffect, useState } from "react";

const SESSION_KEY = "payroll-session";

export const useAuthSession = () => {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  return {
    session,
    isAuthenticated: Boolean(session),
    login: (email) => setSession({ email, loggedInAt: new Date().toISOString() }),
    logout: () => setSession(null),
  };
};
