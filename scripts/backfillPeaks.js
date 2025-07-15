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
/** scripts/backfillPeaks.ts
 * Re-evaluates EVERY activity against the current PEAK_RADIUS_M
 * Run with:  npx ts-node-esm scripts/backfillPeaks.ts
 */
const prisma_1 = __importDefault(require("../src/utils/prisma"));
const geo_1 = require("../src/utils/geo");
(() => __awaiter(void 0, void 0, void 0, function* () {
    const activities = yield prisma_1.default.activity.findMany();
    let total = 0;
    for (const a of activities) {
        const added = yield (0, geo_1.matchPeaksForActivity)(a.id, a.userId);
        console.log(`${a.name.padEnd(35)} +${added}`);
        total += added;
    }
    console.log(`\n==> Added ${total} peak-activity links.`);
    yield prisma_1.default.$disconnect();
}))();
