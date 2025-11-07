import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { RateLimitMiddleware } from '../middleware/rateLimiter.js';
import { ErrorHandler, AppException } from '../middleware/errorHandler.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images, documents, and text files
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/json', 'application/xml'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppException('File type not allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 5 // Max 5 files at once
  }
});

// Single file upload
router.post(
  '/single',
  RateLimitMiddleware.upload,
  upload.single('file'),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw new AppException('No file uploaded', 400);
    }

    const fileData = {
      id: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.user?.id,
      uploadedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: fileData
    });
  })
);

// Multiple files upload
router.post(
  '/multiple',
  RateLimitMiddleware.upload,
  upload.array('files', 5),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppException('No files uploaded', 400);
    }

    const filesData = files.map(file => ({
      id: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: req.user?.id,
      uploadedAt: new Date().toISOString()
    }));

    res.status(201).json({
      success: true,
      data: filesData
    });
  })
);

// Get file info
router.get(
  '/:filename',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new AppException('File not found', 404);
    }

    const stats = fs.statSync(filePath);
    const fileData = {
      filename,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString()
    };

    res.json({
      success: true,
      data: fileData
    });
  })
);

// Download file
router.get(
  '/:filename/download',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new AppException('File not found', 404);
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Download failed'
          });
        }
      }
    });
  })
);

// Delete file
router.delete(
  '/:filename',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new AppException('File not found', 404);
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  })
);

// List all uploaded files
router.get(
  '/',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';

    if (!fs.existsSync(uploadDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };
    });

    res.json({
      success: true,
      data: files
    });
  })
);

export { router as uploadRoutes };