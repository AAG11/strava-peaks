"use strict";
"use client";
/* eslint-disable @typescript-eslint/no-require-imports */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Map;
const react_1 = require("react");
const mapbox_gl_1 = __importDefault(require("mapbox-gl"));
mapbox_gl_1.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
function Map({ peaks }) {
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!ref.current)
            return;
        const map = new mapbox_gl_1.default.Map({
            container: ref.current,
            style: "mapbox://styles/mapbox/outdoors-v12",
            center: [-71.5, 44.2],
            zoom: 7,
        });
        peaks.forEach(p => {
            new mapbox_gl_1.default.Marker({
                color: p.done ? "#16a34a" : "#ca8a04",
            })
                .setLngLat([p.lon, p.lat])
                .setPopup(new mapbox_gl_1.default.Popup().setHTML(`<strong>${p.name}</strong>`))
                .addTo(map);
        });
        return () => map.remove();
    }, [peaks]);
    return <div ref={ref} className="h-96 w-full rounded-lg shadow"/>;
}
