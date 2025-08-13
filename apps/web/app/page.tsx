/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Shape returned by GET /me/peaks
// (we only rely on a few fields; extra fields are ignored)
type Peak = {
  id: number;
  name: string;
  done?: boolean;
  latest_act_id?: string | null;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function DashboardPage() {
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshNow() {
    try {
      setRefreshing(true);
      const r = await fetch(`${API}/me/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (r.status === 401) {
        window.location.href = "/splash";
        return;
      }
      await loadPeaks();
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadPeaks() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/me/peaks`, { credentials: "include" });

      // If the API says we are not authenticated, bounce to splash
      if (r.status === 401) {
        window.location.href = "/splash";
        return;
      }

      if (!r.ok) {
        throw new Error(`API error ${r.status}`);
      }

      const data = await r.json().catch(() => []);
      // Defensive: ensure we always set an array
      setPeaks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("/me/peaks fetch failed", e);
      setError("Failed to load peaks.");
      setPeaks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeaks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneCount = Array.isArray(peaks)
    ? peaks.filter((p) => Boolean((p as any).done)).length
    : 0;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold">NH 4,000‑Footer Progress</h1>
          {!loading && (
            <span className="text-gray-600">{doneCount}/48 complete</span>
          )}
        </div>
        <button
          onClick={refreshNow}
          disabled={refreshing}
          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <section className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">✅ Done</h2>
            <ul className="list-disc list-inside space-y-1">
              {peaks
                .filter((p) => Boolean((p as any).done))
                .map((p) => (
                  <li key={p.id}>
                    {p.latest_act_id ? (
                      <a
                        href={`https://www.strava.com/activities/${p.latest_act_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-700 underline"
                      >
                        {p.name}
                      </a>
                    ) : (
                      <span className="text-green-700">{p.name}</span>
                    )}
                  </li>
                ))}
              {peaks.filter((p) => Boolean((p as any).done)).length === 0 && (
                <li className="text-gray-500">None yet.</li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="font-semibold mb-2">📋 To do</h2>
            <ul className="list-disc list-inside space-y-1">
              {peaks
                .filter((p) => !Boolean((p as any).done))
                .map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              {peaks.filter((p) => !Boolean((p as any).done)).length === 0 && (
                <li className="text-gray-500">All set — nice!</li>
              )}
            </ul>
          </div>
        </section>
      )}

      <nav className="pt-2">
        <Link href="/ascents" className="text-blue-700 underline">
          View all ascents →
        </Link>
      </nav>
    </main>
  );
}