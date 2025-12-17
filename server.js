const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Basic MIME allow-lists
const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeBase) || "";
    const name = `${file.fieldname}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  if (file.fieldname === "sourceImage") {
    return cb(null, ALLOWED_IMAGE.has(file.mimetype));
  }
  if (file.fieldname === "targetVideo") {
    return cb(null, ALLOWED_VIDEO.has(file.mimetype));
  }
  cb(null, false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB per file (adjust)
    files: 2,
  },
});

app.post(
  "/api/upload",
  upload.fields([
    { name: "sourceImage", maxCount: 1 },
    { name: "targetVideo", maxCount: 1 },
  ]),
  (req, res) => {
    const img = req.files?.sourceImage?.[0];
    const vid = req.files?.targetVideo?.[0];

    if (!img || !vid) {
      return res.status(400).json({
        ok: false,
        error:
          "Missing files. Expect multipart fields: sourceImage (image) and targetVideo (video).",
      });
    }

    // At this point you have local file paths to pass into your processing step
    // IMPORTANT: only use this for consented/synthetic subjects.
    const jobId = `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    res.json({
      ok: true,
      jobId,
      sourceImage: {
        filename: img.filename,
        mimetype: img.mimetype,
        size: img.size,
        path: img.path,
      },
      targetVideo: {
        filename: vid.filename,
        mimetype: vid.mimetype,
        size: vid.size,
        path: vid.path,
      },
    });
  }
);

// Simple health
app.get("/health", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on :${port}`));
