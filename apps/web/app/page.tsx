"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

type Peak = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  done: boolean;
  latest_act_id?: string; // you link to this below
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const Map = dynamic(() => import("./Map"), { ssr: false });

export default function Home() {
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPeaks() {
    const data = await fetch(`${API}/me/peaks`).then(r => r.json());
    setPeaks(data);
  }

  useEffect(() => {
    loadPeaks();
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected") === "1") {
      refreshNow().finally(() => {
        // remove the query param so it doesn’t re-trigger
        window.history.replaceState({}, "", window.location.pathname);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function refreshNow() {
    try {
      setRefreshing(true);
      const r = await fetch(`${API}/me/refresh`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as any));
        if (j?.error === "connect-strava" && j.login) {
          window.location.href = j.login; // send to Strava login flow
          return;
        }
        throw new Error(`Refresh failed: ${r.status}`);
      }
      await loadPeaks();
    } catch (e) {
      console.error(e);
      alert("Refresh failed. Check API logs.");
    } finally {
      setRefreshing(false);
    }
  }

  const done = peaks.filter(p => p.done).length;

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">NH 4 000-Footer Progress</h1>
        <button
          onClick={refreshNow}
          disabled={refreshing}
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          title="Pull newest activities from Strava"
        >
          {refreshing ? "Refreshing…" : "Refresh from Strava"}
        </button>
      </div>

      <div className="w-40">
        <CircularProgressbar
          value={done}
          maxValue={48}
          text={`${done}/48`}
          styles={buildStyles({ pathColor: "#16a34a", textSize: "18px" })}
        />
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        <ul>
          <h2 className="font-semibold">✅ Done</h2>
          {peaks.filter(p => p.done).map(p => (
            <li key={p.id}>
              <a
                href={`https://www.strava.com/activities/${p.latest_act_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                {p.name}
              </a>
            </li>
          ))}
        </ul>

        <ul className="space-y-1">
          <h2 className="font-semibold">📋 To do</h2>
          {peaks.filter(p => !p.done).map(p => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </section>

      <a href="/ascents" className="text-blue-700 underline">
        Full ascents table
      </a>

      <Map peaks={peaks} />
    </main>
  );
}