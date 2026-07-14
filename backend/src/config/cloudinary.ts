// cloudinary.ts — one configured Cloudinary client for image uploads.
// We never store image bytes in Postgres — we upload to Cloudinary and save
// only the returned https URL in the image_url column.

import { v2 as cloudinary } from "cloudinary"; // "v2" is their current API
import { env } from "./env";

// Step 1 — hand the SDK our account credentials (from .env).
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Step 2 — a small helper: take a file buffer (from multer) → upload → return the URL.
// Cloudinary's SDK is callback-based for streams, so we wrap it in a Promise.
export function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // upload_stream gives us a writable stream; we push the buffer into it.
    const stream = cloudinary.uploader.upload_stream(
      { folder: `forkflow/${folder}` }, // keeps images organized: forkflow/restaurants, forkflow/menu
      (error, result) => {
        // callback fires when the upload finishes (or fails)
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url); // the https URL we store in the DB
      }
    );
    stream.end(buffer); // write the whole file buffer and close the stream
  });
}
