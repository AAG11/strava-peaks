"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../src/utils/prisma"));
const strava_1 = require("../src/utils/strava");
function importAllActivities() {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma_1.default.user.findFirst();
        if (!user)
            throw new Error("No user in DB");
        const token = yield (0, strava_1.getValidAccessToken)(user.id);
        const perPage = 100; // Strava max = 200; we’ll use 100 for headroom
        let page = 1;
        let imported = 0;
        while (true) {
            const { data: acts } = yield axios_1.default.get(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
            if (acts.length === 0)
                break; // no more pages
            for (const act of acts) {
                // optional: skip non-hike/run if you want
                if (!["Hike", "Run", "TrailRun", "Walk"].includes(act.type))
                    continue;
                yield prisma_1.default.activity.upsert({
                    where: { id: BigInt(act.id) },
                    update: {}, // no update on re-sync; keep original data
                    create: {
                        id: BigInt(act.id),
                        userId: user.id,
                        name: act.name,
                        distance: act.distance,
                        movingTime: act.moving_time,
                        totalElevationGain: act.total_elevation_gain, // NEW
                        startDate: new Date(act.start_date),
                        polyline: act.map.summary_polyline
                    }
                });
                imported++;
            }
            console.log(`Page ${page}: pulled ${acts.length}, kept ${imported}`);
            page++;
            yield new Promise(r => setTimeout(r, 1000)); // 1-sec courtesy to Strava
        }
        console.log(`\n✅  Imported / deduped total: ${imported} activities`);
    });
}
importAllActivities()
    .catch(console.error)
    .finally(() => prisma_1.default.$disconnect());
