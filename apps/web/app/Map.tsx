"use client";
import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function Map({ peaks }: { peaks: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-71.5, 44.2],
      zoom: 7,
    });

    peaks.forEach(p => {
      new mapboxgl.Marker({
        color: p.done ? "#16a34a" : "#ca8a04",
      })
        .setLngLat([p.lon, p.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${p.name}</strong>`))
        .addTo(map);
    });

    return () => map.remove();
  }, [peaks]);

  return <div ref={ref} className="h-96 w-full rounded-lg shadow" />;
}