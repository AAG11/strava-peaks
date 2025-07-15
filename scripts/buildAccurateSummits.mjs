/**
 * buildAccurateSummits.mjs
 * --------------------------------------------------------------
 * Fetches lat/lon for the 48 NH 4 000-footers from Wikipedia,
 * then writes   scripts/summits_accurate.json
 *        and   scripts/summits_accurate.csv   (for eyeballing)
 *
 * Usage: node scripts/buildAccurateSummits.mjs
 * --------------------------------------------------------------
 */
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---- 48 official AMC peak page titles on Wikipedia ---- */
const PEAKS = [
  'Mount Washington',
  'Mount Adams (New Hampshire)',
  'Mount Jefferson (New Hampshire)',
  'Mount Monroe',
  'Mount Madison',
  'Mount Lafayette',
  'Mount Lincoln (New Hampshire)',
  'South Twin Mountain (New Hampshire)',
  'Carter Dome',
  'Mount Moosilauke',
  'Mount Eisenhower (New Hampshire)',
  'North Twin Mountain (New Hampshire)',
  'Mount Carrigain',
  'Mount Bond',
  'Middle Carter Mountain',
  'West Bond (New Hampshire)',
  'Mount Garfield (New Hampshire)',
  'Mount Liberty (New Hampshire)',
  'South Carter Mountain',
  'Wildcat Mountain (New Hampshire)',
  'Mount Hancock (New Hampshire)',
  'South Kinsman Mountain',
  'Mount Field (New Hampshire)',
  'Mount Osceola',
  'Mount Flume',
  'South Hancock Mountain',
  'Mount Pierce (New Hampshire)',
  'North Kinsman Mountain',
  'Mount Willey',
  'Bondcliff',
  'Zealand Mountain',
  'North Tripyramid Mountain',
  'Mount Cabot',
  'East Peak Mount Osceola',
  'Middle Tripyramid Mountain',
  'Cannon Mountain (New Hampshire)',
  'Mount Passaconaway',
  'Mount Hale (New Hampshire)',
  'Wildcat D',
  'Mount Jackson (New Hampshire)',
  'Mount Tom (New Hampshire)',
  'Mount Moriah (New Hampshire)',
  "Owl's Head (Franconia, New Hampshire)",
  'Galehead Mountain',
  'Mount Whiteface (New Hampshire)',
  'Mount Waumbek',
  'Mount Isolation',
  'Mount Tecumseh'
];

/* ------------ helper to fetch one page’s coordinates ---------- */
async function wikiCoords(title) {
  const url =
    'https://en.wikipedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: 2,
      prop: 'coordinates|pageprops',
      titles: title
    });
  const { data } = await axios.get(url);
  const page = data.query.pages[0];
  if (!page.coordinates) {
    throw new Error(`No coords for ${title} – check page title.`);
  }
  const { lat, lon } = page.coordinates[0];
  const elev =
    page.pageprops && page.pageprops['wikibase-shortdesc']
      ? page.pageprops['wikibase-shortdesc'].match(/(\d{3,4})\s*ft/)
      : null;
  return { name: title.replace(/\s*\(.*?\)/, ''), lat, lon, elevation: elev ? +elev[1] : null };
}

/* --------------------- main runner --------------------------- */
const results = [];
for (const title of PEAKS) {
  try {
    const row = await wikiCoords(title);
    console.log('✔︎', row.name, row.lat.toFixed(5), row.lon.toFixed(5));
    results.push(row);
  } catch (err) {
    console.error('⚠︎', title, err.message);
  }
}

/* ---- write JSON (pretty) ---- */
const jsonPath = path.join(__dirname, 'summits_accurate.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log('\nWrote', jsonPath);

/* ---- write CSV for quick eyeball ---- */
const csvPath = path.join(__dirname, 'summits_accurate.csv');
fs.writeFileSync(
  csvPath,
  'name,lat,lon,elevation_ft\n' +
    results.map(r => `${r.name},${r.lat},${r.lon},${r.elevation ?? ''}`).join('\n')
);
console.log('Wrote', csvPath);