/**
 * Client-side image resize and compression utility.
 * Resizes to 100×100 px, compresses as JPEG, enforces 10 KB limit.
 */

const MAX_DIM = 100;   // pixels
const MAX_KB  = 10;    // kilobytes
const MAX_BYTES = MAX_KB * 1024;

export type ImageError = "too_large" | "invalid_file" | "resize_failed";

export type ImageResult =
  | { ok: true;  dataUrl: string; sizeBytes: number }
  | { ok: false; error: ImageError; message: string };

/**
 * Takes a File from an <input type="file">, resizes to 100×100, compresses to JPEG,
 * and returns the Base64 data URL if under 10 KB, or an error object.
 */
export async function processProfileImage(file: File): Promise<ImageResult> {
  // Validate type
  if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, error: "invalid_file", message: "Only JPEG, PNG or WebP images are accepted." };
  }

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onerror = () => resolve({ ok: false, error: "invalid_file", message: "Could not read the image file." });
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve({ ok: false, error: "resize_failed", message: "Could not decode image." });
      img.onload = () => {
        // Draw on 100×100 canvas (square crop from centre)
        const canvas = document.createElement("canvas");
        canvas.width = MAX_DIM;
        canvas.height = MAX_DIM;
        const ctx = canvas.getContext("2d")!;

        // Centre-crop to square
        const side = Math.min(img.width, img.height);
        const sx = (img.width  - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_DIM, MAX_DIM);

        // Try decreasing quality until under 10 KB
        const qualities = [0.8, 0.65, 0.5, 0.35, 0.2];
        for (const q of qualities) {
          const dataUrl = canvas.toDataURL("image/jpeg", q);
          // Base64 payload length → approximate decoded byte size
          const b64 = dataUrl.split(",")[1] || "";
          const sizeBytes = Math.ceil(b64.length * 0.75);
          if (sizeBytes <= MAX_BYTES) {
            return resolve({ ok: true, dataUrl, sizeBytes });
          }
        }
        // Even at lowest quality it's over 10 KB — image is too large/complex
        resolve({
          ok: false,
          error: "too_large",
          message: `Image is too large even after compression. Please use a simpler photo (max ${MAX_KB} KB).`,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/** Format bytes as "X.X KB" */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
