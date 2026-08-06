import multer from "multer";
import { ApiError } from "../utils/apiError";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {

    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest("Only image files are allowed"));
    }
  },
});
