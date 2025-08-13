/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  peak: string;
  date: string;          // ISO
  moving: number | null; // seconds
  gain: number | null;   // metres
  dist: number | null;   // metres
  act_id: string;        // strava id as string
};

/* ───── helpers ─────────────────────────────────────────────── */
const API = process.env.NEXT_PUBLIC_API_URL as string;

const miles = (m: number) => (m / 1609.344);
const feet  = (m: number) => (m * 3.28084);

const fmtMi = (m: number | null) =>
  m == null ? "—" : miles(m).toFixed(2);

const fmtFt = (m: number | null) =>
  m == null ? "—" : feet(m).toFixed(0);

const fmtHMS = (s: number | null) => {
  if (s == null || !Number.isFinite(s)) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${`${m}`.padStart(2, "0")}:${`${sec}`.padStart(2, "0")}`;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

export default function Ascents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Row>("date");
  const [asc, setAsc] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/me/ascents`, { credentials: "include" });
      if (r.status === 401) {
        // not authed -> bounce to splash
        window.location.href = "/";
        return;
      }
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load ascents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sorting helpers
  const keyKind: Record<keyof Row, "string" | "number" | "date"> = {
    peak: "string",
    date: "date",
    moving: "number",
    gain: "number",
    dist: "number",
    act_id: "string",
  };

  const compValue = (r: Row, key: keyof Row) => {
    const v = r[key] as any;
    switch (keyKind[key]) {
      case "number":
        return v == null ? Number.NEGATIVE_INFINITY : Number(v);
      case "date":
        return new Date(r.date).getTime();
      default:
        return (v ?? "").toString().toLowerCase();
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const A = compValue(a, sortKey);
    const B = compValue(b, sortKey);
    if (A === B) return 0;
    const dir = asc ? 1 : -1;
    // numeric compare when both are numbers
    if (typeof A === "number" && typeof B === "number") {
      return (A - B) * dir;
    }
    return (A < B ? -1 : 1) * dir;
  });

  const toggle = (key: keyof Row) => {
    if (key === sortKey) return setAsc(!asc);
    setSortKey(key);
    setAsc(false);
  };

  const arrow = (key: keyof Row) =>
    sortKey === key ? (asc ? "▲" : "▼") : "";

  async function refreshNow() {
    try {
      const r = await fetch(`${API}/me/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (r.status === 401) {
        window.location.href = "/";
        return;
      }
      await load();
    } catch {
      // ignore
    }
  }

  /* ─ UI ───────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ascents</h1>
        <button
          onClick={refreshNow}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Refresh from Strava
        </button>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading ascents…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left">
                <Th onClick={() => toggle("peak")}  label={`Peak ${arrow("peak")}`} />
                <Th onClick={() => toggle("date")}  label={`Date ${arrow("date")}`} />
                <Th onClick={() => toggle("moving")} label={`Moving ${arrow("moving")}`} />
                <Th onClick={() => toggle("gain")}  label={`Gain (ft) ${arrow("gain")}`} />
                <Th onClick={() => toggle("dist")}  label={`Dist (mi) ${arrow("dist")}`} />
                <Th label="Strava" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((r, i) => (
                <tr key={i} className="bg-white dark:bg-gray-900">
                  <Td>{r.peak}</Td>
                  <Td>{fmtDate(r.date)}</Td>
                  <Td mono>{fmtHMS(r.moving)}</Td>
                  <Td mono>{fmtFt(r.gain)}</Td>
                  <Td mono>{fmtMi(r.dist)}</Td>
                  <Td>
                    <Link
                      href={`https://www.strava.com/activities/${r.act_id}`}
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// simple table cell/header components for consistent spacing
function Th({
  label,
  onClick,
}: { label: string; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 font-semibold ${onClick ? "cursor-pointer select-none" : ""}`}
    >
      {label}
    </th>
  );
}

function Td({
  children,
  mono,
}: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 ${mono ? "tabular-nums font-mono" : ""}`}>
      {children}
    </td>
  );
}