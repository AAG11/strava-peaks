"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = __importDefault(require("../src/utils/prisma.js"));
const rows = await prisma_js_1.default.$queryRaw `
  SELECT a.id,
         a.name,
         COUNT(pa."peakId")::int AS peaks_hit
  FROM   "Activity" a
  LEFT JOIN "PeakOnActivity" pa ON pa."activityId" = a.id
  GROUP  BY a.id
  ORDER  BY peaks_hit DESC
  LIMIT  10;
`;
console.table(rows);
await prisma_js_1.default.$disconnect();
