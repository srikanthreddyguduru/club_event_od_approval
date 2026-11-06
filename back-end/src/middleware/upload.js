import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || './private_uploads');
fs.mkdirSync(uploadRoot, { recursive: true });
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, allowed.has(file.mimetype))
}).single('file');

const signatures = {
  'application/pdf': (b) => b.subarray(0, 5).toString() === '%PDF-',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
};

export function uploadEvidence(req, res, next) {
  upload(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return next();
    try {
      const handle = await fsp.open(req.file.path, 'r');
      const header = Buffer.alloc(16);
      await handle.read(header, 0, header.length, 0);
      await handle.close();
      if (!signatures[req.file.mimetype]?.(header)) {
        await fsp.unlink(req.file.path);
        return next(Object.assign(new Error('Uploaded file content does not match an allowed PDF or image type.'), { status: 400 }));
      }
      next();
    } catch (validationError) {
      next(validationError);
    }
  });
}

export { uploadRoot };
