"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Ascents;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
/* ───── helpers ─────────────────────────────────────────────── */
const mToMi = (m) => (m / 1609.344).toFixed(2);
const mToFt = (m) => (m * 3.28084).toFixed(0);
const hms = (s) => new Date(s * 1000).toISOString().substring(11, 19);
function Ascents() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const [sortKey, setSortKey] = (0, react_1.useState)("date");
    const [asc, setAsc] = (0, react_1.useState)(false);
    /* fetch once */
    (0, react_1.useEffect)(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/ascents`)
            .then(r => r.json())
            .then(setRows);
    }, []);
    /* sortable copy */
    const sorted = [...rows].sort((a, b) => {
        const dir = asc ? 1 : -1;
        const x = a[sortKey], y = b[sortKey];
        if (x === y)
            return 0;
        // numeric vs string compare
        return x < y ? -dir : dir;
    });
    const toggle = (key) => {
        if (key === sortKey)
            return setAsc(!asc);
        setSortKey(key);
        setAsc(false);
    };
    const arrow = (key) => sortKey === key ? (asc ? "▲" : "▼") : "";
    /* ─ UI ───────────────────────────────────────────────────── */
    return (<div className="p-6 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">4 000-Footer Ascents</h1>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b font-semibold text-left">
            <th onClick={() => toggle("peak")} className="cursor-pointer">Peak {arrow("peak")}</th>
            <th onClick={() => toggle("date")} className="cursor-pointer">Date {arrow("date")}</th>
            <th onClick={() => toggle("moving")} className="cursor-pointer">Time {arrow("moving")}</th>
            <th onClick={() => toggle("gain")} className="cursor-pointer">Gain (ft) {arrow("gain")}</th>
            <th onClick={() => toggle("dist")} className="cursor-pointer">Dist (mi) {arrow("dist")}</th>
            <th>Link</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((r, i) => (<tr key={i} className="border-b">
              <td>{r.peak}</td>
              <td>{r.date.slice(0, 10)}</td>
              <td>{hms(r.moving)}</td>
              <td>{r.gain !== null ? mToFt(r.gain) : "—"}</td>
              <td>{mToMi(r.dist)}</td>
              <td>
                <link_1.default href={`https://www.strava.com/activities/${r.act_id}`} target="_blank" className="text-blue-600 hover:underline">
                  view
                </link_1.default>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
