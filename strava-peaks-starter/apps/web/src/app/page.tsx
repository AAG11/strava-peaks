"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "mapbox-gl/dist/mapbox-gl.css";

const Map = dynamic(() => import("./Map"), { ssr: false });
type Peak = { id: number; name: string; done: boolean; lat: number; lon: number };

export default function Home() {
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const done = peaks.filter(p => p.done).length;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/peaks`)
      .then(r => r.json())
      .then(setPeaks);
  }, []);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">NH 4 000-Footer Progress</h1>
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
          {peaks.filter(p => p.done).map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <ul>
          <h2 className="font-semibold">📋 To do</h2>
          {peaks.filter(p => !p.done).map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
      </section>

      <Map peaks={peaks} />
    </main>
  );
}
