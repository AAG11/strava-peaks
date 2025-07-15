"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const dynamic_1 = __importDefault(require("next/dynamic"));
const react_circular_progressbar_1 = require("react-circular-progressbar");
require("react-circular-progressbar/dist/styles.css");
require("mapbox-gl/dist/mapbox-gl.css");
require("./globals.css");
const Map = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require("./Map"))), { ssr: false });
const mToMi = (m) => (m / 1609.344).toFixed(2);
const mToFt = (m) => (m * 3.28084).toFixed(0);
function Home() {
    const [peaks, setPeaks] = (0, react_1.useState)([]);
    const done = peaks.filter(p => p.done).length;
    (0, react_1.useEffect)(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/peaks`)
            .then(r => r.json())
            .then(setPeaks);
    }, []);
    return (<main className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">NH 4 000-Footer Progress</h1>

      <div className="w-40">
        <react_circular_progressbar_1.CircularProgressbar value={done} maxValue={48} text={`${done}/48`} styles={(0, react_circular_progressbar_1.buildStyles)({
            pathColor: "#16a34a",
            textSize: "18px",
        })}/>
      </div>

      <section className="grid md:grid-cols-2 gap-4">
      <ul>
        <h2 className="font-semibold">✅ Done</h2>
        {peaks
            .filter(p => p.done)
            .map(p => (<li key={p.id}>
              <a href={`https://www.strava.com/activities/${p.latest_act_id}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                {p.name}
              </a>
            </li>))}
      </ul>
        <ul className="space-y-1">
          <h2 className="font-semibold">📋 To do</h2>
          {peaks.filter(p => !p.done).map(p => (<li key={p.id}>{p.name}</li>))}
        </ul>
      </section>
      <a href="/ascents" className="text-blue-700 underline">Full ascents table</a>
      <Map peaks={peaks}/>
    </main>);
}
