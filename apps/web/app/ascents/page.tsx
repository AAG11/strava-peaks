/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  peak: string;
  date: string;          // ISO
  moving: number;        // seconds
  gain: number | null;   // metres
  dist: number;          // metres
  act_id: string;        // strava id as string
};

/* ───── helpers ─────────────────────────────────────────────── */
const mToMi = (m: number) => (m / 1609.344).toFixed(2);
const mToFt = (m: number) => (m * 3.28084).toFixed(0);
const hms = (s: number) => new Date(s * 1000).toISOString().substring(11, 19);

export default function Ascents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sortKey, setSortKey] = useState<keyof Row>("date");
  const [asc, setAsc] = useState(false);

  /* fetch once */
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/ascents`)
      .then(r => r.json())
      .then(setRows);
  }, []);

  /* sortable copy */
  const sorted = [...rows].sort((a, b) => {
    const dir = asc ? 1 : -1;
    const x = a[sortKey], y = b[sortKey];
    if (x === y) return 0;
    // numeric vs string compare
    return (x as any) < (y as any) ? -dir : dir;
  });

  const toggle = (key: keyof Row) => {
    if (key === sortKey) return setAsc(!asc);
    setSortKey(key); setAsc(false);
  };

  const arrow = (key: keyof Row) =>
    sortKey === key ? (asc ? "▲" : "▼") : "";

  /* ─ UI ───────────────────────────────────────────────────── */
  return (
    <div className="p-6 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">4 000-Footer Ascents</h1>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b font-semibold text-left">
            <th onClick={() => toggle("peak")}   className="cursor-pointer">Peak {arrow("peak")}</th>
            <th onClick={() => toggle("date")}   className="cursor-pointer">Date {arrow("date")}</th>
            <th onClick={() => toggle("moving")} className="cursor-pointer">Time {arrow("moving")}</th>
            <th onClick={() => toggle("gain")}   className="cursor-pointer">Gain (ft) {arrow("gain")}</th>
            <th onClick={() => toggle("dist")}   className="cursor-pointer">Dist (mi) {arrow("dist")}</th>
            <th>Link</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((r, i) => (
            <tr key={i} className="border-b">
              <td>{r.peak}</td>
              <td>{r.date.slice(0, 10)}</td>
              <td>{hms(r.moving)}</td>
              <td>{r.gain !== null ? mToFt(r.gain) : "—"}</td>
              <td>{mToMi(r.dist)}</td>
              <td>
                <Link
                  href={`https://www.strava.com/activities/${r.act_id}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  view
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}