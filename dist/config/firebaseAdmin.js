"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = void 0;
const auth_1 = require("firebase-admin/auth");
require('dotenv').config();
const firebase_admin_1 = __importDefault(require("firebase-admin"));
if (!process.env.FIREBASE_CREDENTIALS) {
    throw new Error("firebase credential aunotherized");
}
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount)
});
exports.adminAuth = (0, auth_1.getAuth)();
