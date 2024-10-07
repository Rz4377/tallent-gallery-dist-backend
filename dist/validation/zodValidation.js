"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostSchema = exports.signupSchmea = void 0;
const zod_1 = __importDefault(require("zod"));
exports.signupSchmea = zod_1.default.object({
    name: zod_1.default.string().min(4),
    uid: zod_1.default.string().min(4),
    userId: zod_1.default.string().min(3),
    email: zod_1.default.string().email()
});
exports.createPostSchema = zod_1.default.object({
    title: zod_1.default.string(),
    uid: zod_1.default.string(),
    description: zod_1.default.string(),
    github: zod_1.default.string().optional(),
    liveLink: zod_1.default.string().optional(),
    imageUrl: zod_1.default.string().optional(),
    videoUrl: zod_1.default.string().optional()
});
