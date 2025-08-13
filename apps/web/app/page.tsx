/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ascent = {
  peak_id: number;
  peak_name: string;
  act_id: string;
  date: string; // ISO
  distance_m: number | null;
  moving_time_s: number | null;
  gain_m: number | null;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function AscentsPage() {
  const [rows, setRows] = useState<Ascent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/me/ascents`, { credentials: "include" });
      if (r.status === 401) {
        // Not logged in: bounce to splash to connect Strava
        window.location.href = "/splash";
        return;
      }
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setError("Failed to load ascents.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function fmtMiles(m: number | null) {
    if (m === null || m === undefined) return "—";
    return (m / 1609.34).toFixed(1);
  }

  function fmtFeet(m: number | null) {
    if (m === null || m === undefined) return "—";
    return Math.round(m * 3.28084).toLocaleString();
  }

  function fmtHMS(s: number | null) {
    if (s === null || s === undefined) return "—";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m` : `${m}m ${sec}s`;
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ascents</h1>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Peak</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-right">Distance (mi)</th>
                <th className="p-2 text-right">Gain (ft)</th>
                <th className="p-2 text-right">Moving Time</th>
                <th className="p-2 text-left">Strava</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.peak_id}-${r.act_id}`} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2">{r.peak_name}</td>
                  <td className="p-2">{fmtDate(r.date)}</td>
                  <td className="p-2 text-right">{fmtMiles(r.distance_m)}</td>
                  <td className="p-2 text-right">{fmtFeet(r.gain_m)}</td>
                  <td className="p-2 text-right">{fmtHMS(r.moving_time_s)}</td>
                  <td className="p-2">
                    <a
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.strava.com/activities/${r.act_id}`}
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No ascents found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link href="/" className="text-blue-700 underline">
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}