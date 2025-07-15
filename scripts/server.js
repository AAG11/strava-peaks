"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
app.use((0, cookie_parser_1.default)());
dotenv_1.default.config(); // loads .env
const app = (0, express_1.default)();
app.get("/health", (_, res) => res.send("ok"));
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
