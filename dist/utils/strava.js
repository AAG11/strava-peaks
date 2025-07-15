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
exports.getValidAccessToken = getValidAccessToken;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("./prisma"));
function getValidAccessToken(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error("User not found");
        const expiresAt = user.tokenExpiresAt.getTime();
        const now = Date.now();
        // Give ourselves 60-sec buffer
        if (now < expiresAt - 60000) {
            return user.accessToken; // still fresh
        }
        // --- refresh ---
        const { data } = yield axios_1.default.post("https://www.strava.com/oauth/token", {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: user.refreshToken
        });
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                tokenExpiresAt: new Date(data.expires_at * 1000)
            }
        });
        return data.access_token;
    });
}
