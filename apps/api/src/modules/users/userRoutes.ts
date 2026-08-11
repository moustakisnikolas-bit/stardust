import { Router } from "express";
import multer from "multer";
import { profileUpdateSchema, pushSubscriptionSchema, pushUnsubscribeSchema } from "@stardust/shared-types";
import { authGuard } from "../../middleware/authGuard.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { addPhoto, deletePhoto, getMyProfile, updateProfile } from "./userService.js";
import { removeSubscription, saveSubscription } from "../push/pushService.js";

export const userRoutes = Router();

userRoutes.use(authGuard);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(new HttpError(400, "UNSUPPORTED_IMAGE_TYPE", "Only JPEG, PNG, or WebP images are supported"));
      return;
    }
    cb(null, true);
  },
});

userRoutes.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ profile: await getMyProfile(req.userId!) });
  }),
);

userRoutes.put(
  "/me",
  asyncHandler(async (req, res) => {
    const input = profileUpdateSchema.parse(req.body);
    res.json({ profile: await updateProfile(req.userId!, input) });
  }),
);

userRoutes.post(
  "/me/photos",
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "VALIDATION_ERROR", "No photo uploaded");
    }
    const photo = await addPhoto(req.userId!, { buffer: req.file.buffer, mimeType: req.file.mimetype });
    res.status(201).json({ photo });
  }),
);

userRoutes.delete(
  "/me/photos/:photoId",
  asyncHandler(async (req, res) => {
    await deletePhoto(req.userId!, req.params.photoId);
    res.status(204).send();
  }),
);

userRoutes.post(
  "/me/push-subscription",
  asyncHandler(async (req, res) => {
    const input = pushSubscriptionSchema.parse(req.body);
    await saveSubscription(req.userId!, input);
    res.status(204).send();
  }),
);

userRoutes.delete(
  "/me/push-subscription",
  asyncHandler(async (req, res) => {
    const { endpoint } = pushUnsubscribeSchema.parse(req.body);
    await removeSubscription(endpoint);
    res.status(204).send();
  }),
);
