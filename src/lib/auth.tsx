// @ts-nocheck
// Auth context + provider + login screen.
// Uses Supabase's magic-link (passwordless email) flow: user types email, gets
// a one-click link, Supabase redirects back, session persists in localStorage.

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for an existing session on mount (persists across tabs + reloads)
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    // 2. Subscribe to future auth state changes (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// -----------------------------------------------------------------------------
// Login screen — shown when user is not authenticated
// -----------------------------------------------------------------------------

const C = {
  navy: "#1B2A4A",
  navyD: "#0f1a30",
  lb: "#D6E4F0",
  bg: "#F5F7FA",
  border: "#E5E7EB",
  sec: "#6B7280",
  pri: "#1F2937",
  accent: "#4A90D9",
  ok: "#10B981",
  bad: "#EF4444",
  gold: "#D97706",
  white: "#FFFFFF",
};
const F = "'Aptos Narrow','Segoe UI',system-ui,sans-serif";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // After clicking the magic link, bring the user right back to the app
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err?.message || String(err));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg,${C.navy} 0%,${C.navyD} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: F,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 12,
          padding: "32px 36px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 50px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: C.sec,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Bayou Real Estate Ventures, LLC
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.navy,
            margin: 0,
            marginBottom: 6,
          }}
        >
          Deal Pipeline
        </h1>
        <p style={{ fontSize: 11, color: C.sec, marginBottom: 24, lineHeight: 1.5 }}>
          Sign in with your email. We'll send you a one-click magic link — no
          password to remember. Your pipeline syncs across every device you
          sign into.
        </p>

        {status === "sent" ? (
          <div
            style={{
              background: "#f0fdf4",
              border: `1px solid ${C.ok}`,
              borderRadius: 8,
              padding: "14px 16px",
              fontSize: 11,
              color: C.ok,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Check your inbox</div>
            <div style={{ color: C.pri }}>
              We sent a login link to <strong>{email}</strong>. Click it from any
              device to sign in.
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: C.sec,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "block",
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontFamily: F,
                color: C.pri,
                boxSizing: "border-box",
                marginBottom: 14,
              }}
            />
            <button
              type="submit"
              disabled={status === "sending"}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: status === "sending" ? C.sec : C.navy,
                border: "none",
                borderRadius: 6,
                cursor: status === "sending" ? "wait" : "pointer",
                fontFamily: F,
                letterSpacing: 0.5,
              }}
            >
              {status === "sending" ? "Sending link…" : "Send magic link →"}
            </button>
            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 10px",
                  background: "#fef2f2",
                  border: `1px solid ${C.bad}`,
                  borderRadius: 5,
                  fontSize: 10,
                  color: C.bad,
                }}
              >
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
