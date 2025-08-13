"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function Splash() {
  const [checking, setChecking] = useState(true);

  // If user already has a valid cookie with the API, skip splash.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/me/peaks`, { credentials: "include" });
        if (!cancelled && r.ok) {
          window.location.href = "/"; // already connected
          return;
        }
      } catch {
        // ignore — we'll just show the splash
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100svh", padding: "2rem" }}>
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Strava Peaks</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Track your NH 4,000-footers automatically from your Strava hikes and trail runs.
        </p>

        {/* Connect button */}
        <a
          href={`${API}/auth/login`}
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: 8,
            background: "#fc4c02",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Log in with Strava
        </a>

        {!checking && (
          <p style={{ color: "#888", fontSize: 12, marginTop: 16 }}>
            By continuing you agree to store a login cookie for this browser so we can fetch your Strava data securely.
          </p>
        )}
      </div>
    </main>
  );
}