// upload.middleware.ts — multer setup for image uploads.
// What multer does: browsers send files as `multipart/form-data` (not JSON).
// Express can't read that by itself. Multer parses it and gives us the file
// as a Buffer on req.file — which we then push to Cloudinary.

import multer from "multer";
import { ApiError } from "../utils/apiError";

// memoryStorage = keep the uploaded file in RAM as a Buffer (req.file.buffer).
// We don't want files on disk — they go straight to Cloudinary and are gone.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB — bigger gets rejected
  fileFilter: (_req, file, cb) => {
    // only allow actual images (mimetype like "image/png", "image/jpeg")
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // accept
    } else {
      cb(ApiError.badRequest("Only image files are allowed")); // reject with a 400
    }
  },
});
// Usage in a route:  upload.single("image")  → expects one file under field name "image"
