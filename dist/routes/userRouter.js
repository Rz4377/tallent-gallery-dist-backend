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
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zodValidation_1 = require("../validation/zodValidation"); // Ensure correct import path
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware")); // Ensure correct import path
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_s3_1 = require("@aws-sdk/client-s3");
dotenv_1.default.config();
if (!process.env.AWS_REGION) {
    throw Error("aws credentials not init");
}
if (!process.env.AWS_ACCESS_KEY_ID) {
    throw Error("aws credentials not init");
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw Error("aws credentials not init");
}
const s3ClientInfo = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const bucketName = process.env.AWS_BUCKET_NAME || 'user-storage-bucket';
const prisma = new client_1.PrismaClient();
const userRouter = (0, express_1.default)();
userRouter.post("/userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    try {
        let foundUserId = yield prisma.user.findUnique({
            where: {
                userId: userId,
            },
        });
        if (foundUserId) {
            return res.status(200).json({ message: "User ID already exists", exists: true });
        }
        else {
            return res.status(200).json({ message: "User ID is available", exists: false });
        }
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error });
    }
}));
userRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, userId, uid, email } = req.body;
    const zod_result = zodValidation_1.signupSchmea.safeParse(req.body);
    if (!zod_result.success) {
        res.status(400).json({
            message: "Invalid input",
            zod_error: zod_result.error
        });
        return;
    }
    try {
        // Check if userId already exists
        const existingUser = yield prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (existingUser) {
            return res.status(409).json({
                message: "User ID already exists"
            });
        }
        // Proceed to create the user
        yield prisma.user.create({
            data: {
                name,
                userId,
                uid,
                email
            }
        });
        res.status(201).json({
            message: "User created successfully"
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Internal server error"
        });
    }
}));
const storage = (0, multer_s3_1.default)({
    s3: s3ClientInfo,
    bucket: bucketName,
    metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
        cb(null, `${Date.now().toString()}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'video/mp4', 'video/webm'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PNG, JPEG, MP4, and WebM are allowed.'));
        }
    }
});
userRouter.post("/createPosts", upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'videoFile', maxCount: 1 }]), authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Initialize URLs as null
    let imageUrl = null;
    let videoUrl = null;
    // Check and assign if image file is uploaded
    if (req.files && req.files['imageFile']) {
        imageUrl = (_a = req.files['imageFile'][0]) === null || _a === void 0 ? void 0 : _a.location;
    }
    // Check and assign if video file is uploaded
    if (req.files && req.files['videoFile']) {
        videoUrl = (_b = req.files['videoFile'][0]) === null || _b === void 0 ? void 0 : _b.location;
    }
    const { uid, title, github, liveLink, description } = req.body;
    // Validate the complete object including the URLs
    const zodResult = zodValidation_1.createPostSchema.safeParse(req.body);
    if (!zodResult.success) {
        return res.status(400).json({
            message: "Invalid input",
            errors: zodResult.error.issues.map(issue => issue.message).join(", ")
        });
    }
    try {
        const post = yield prisma.post.create({
            data: {
                projectTitle: title,
                uid: uid,
                projectDesc: {
                    create: {
                        githubLink: github,
                        liveLink: liveLink,
                        postImage: imageUrl, // Can be null if not uploaded
                        postVideo: videoUrl, // Can be null if not uploaded
                        description: description
                    }
                }
            }
        });
        return res.status(201).json({
            message: "Post created successfully",
            post
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error
        });
    }
}));
userRouter.delete("/deletePost/:projectId", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const uid = req.body.uid; // Assuming authenticationMiddleware attaches user to req.user
    try {
        // Check if the post exists and belongs to the user
        const existingPost = yield prisma.post.findUnique({
            where: { projectId },
        });
        if (!existingPost || existingPost.uid !== uid) {
            return res.status(404).json({ message: "Post not found or unauthorized" });
        }
        // Delete the post
        yield prisma.post.delete({
            where: { projectId },
        });
        res.status(200).json({ message: "Post deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}));
userRouter.put("/updatePost/:projectId", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const { projectTitle, projectDesc } = req.body;
    const uid = req.body.uid;
    try {
        // Check if the post exists and belongs to the user
        const existingPost = yield prisma.post.findUnique({
            where: { projectId },
            include: { projectDesc: true },
        });
        if (!existingPost || existingPost.uid !== uid) {
            return res.status(404).json({ message: "Post not found or unauthorized" });
        }
        // Update the post
        yield prisma.post.update({
            where: { projectId },
            data: {
                projectTitle,
                projectDesc: {
                    upsert: {
                        create: {
                            description: projectDesc.description,
                            liveLink: projectDesc.liveLink,
                            githubLink: projectDesc.githubLink,
                            postImage: projectDesc.postImage,
                            postVideo: projectDesc.postVideo,
                        },
                        update: {
                            description: projectDesc.description,
                            liveLink: projectDesc.liveLink,
                            githubLink: projectDesc.githubLink,
                            postImage: projectDesc.postImage,
                            postVideo: projectDesc.postVideo,
                        },
                    },
                },
            },
        });
        res.status(200).json({ message: "Post updated successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}));
userRouter.get("/feed", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;
    const limitNumber = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 10;
    const skip = (pageNumber - 1) * limitNumber;
    try {
        const totalPosts = yield prisma.post.count();
        const postWithDetails = yield prisma.post.findMany({
            skip: skip,
            take: limitNumber,
            include: {
                projectDesc: {
                    select: {
                        description: true,
                        liveLink: true,
                        githubLink: true,
                        postImage: true,
                        postVideo: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        const postData = postWithDetails.map(post => {
            var _a, _b, _c, _d, _e, _f;
            return ({
                projectId: post.projectId,
                projectTitle: post.projectTitle,
                createdAt: post.createdAt,
                description: ((_a = post.projectDesc) === null || _a === void 0 ? void 0 : _a.description) || null,
                liveLink: ((_b = post.projectDesc) === null || _b === void 0 ? void 0 : _b.liveLink) || null,
                githubLink: ((_c = post.projectDesc) === null || _c === void 0 ? void 0 : _c.githubLink) || null,
                postImage: ((_d = post.projectDesc) === null || _d === void 0 ? void 0 : _d.postImage) || null,
                postVideo: ((_e = post.projectDesc) === null || _e === void 0 ? void 0 : _e.postVideo) || null,
                userName: ((_f = post.user) === null || _f === void 0 ? void 0 : _f.name) || null
            });
        });
        res.status(200).json({
            success: true,
            data: postData,
            totalPosts,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalPosts / limitNumber),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}));
userRouter.post("/userPost", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userUid = req.body.uid;
    try {
        let response = yield prisma.post.findMany({
            where: {
                uid: userUid
            },
            select: {
                projectId: true,
                projectTitle: true,
                projectDesc: {
                    select: {
                        description: true,
                        liveLink: true,
                        githubLink: true,
                        postImage: true,
                        postVideo: true
                    },
                },
            },
        });
        return res.status(200).json({
            response
        });
    }
    catch (error) {
        return res.status(400).json({
            error: "request failed"
        });
    }
}));
exports.default = userRouter;
