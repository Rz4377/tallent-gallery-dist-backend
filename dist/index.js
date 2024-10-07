"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const userRouter_1 = __importDefault(require("./routes/userRouter"));
// import path from 'path';
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 
app.use('/api/v1/user', userRouter_1.default);
app.listen(3000, () => console.log('server currently running on 3000'));
