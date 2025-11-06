import { createReadStream, statSync } from 'fs';
import path from 'path';
import AWS from 'aws-sdk';

export interface StorageResult {
  ok: boolean;
  publicUrl?: string;
  signedUrl?: string;
  expiresAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_MAX_MB = 500;
const DEFAULT_EXPIRY_SECONDS = 24 * 60 * 60;

const mimeLookup: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  json: 'application/json',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const resolveContentType = (filePath: string): string =>
  mimeLookup[path.extname(filePath).replace('.', '').toLowerCase()] ||
  'application/octet-stream';

class S3Storage {
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly publicBase?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || '';
    this.publicBase = process.env.S3_PUBLIC_BASE_URL;
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async upload(
    localPath: string,
    key: string,
    metadata: Record<string, string> = {},
  ): Promise<StorageResult> {
    try {
      const stats = statSync(localPath);
      const maxBytes =
        (Number(process.env.MAX_ARTIFACT_SIZE_MB) || DEFAULT_MAX_MB) *
        1024 *
        1024;

      if (stats.size > maxBytes) {
        return {
          ok: false,
          error: `File too large: ${Math.round(stats.size / 1024 / 1024)}MB`,
        };
      }

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: createReadStream(localPath),
        ContentType: resolveContentType(localPath),
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'retention-days': String(
            process.env.ARTIFACT_RETENTION_DAYS || '90',
          ),
          ...metadata,
        },
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA',
      };

      const result = await this.s3.upload(uploadParams).promise();
      const expiresIn =
        Number(process.env.SIGNED_URL_TTL_SECONDS) || DEFAULT_EXPIRY_SECONDS;

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      });

      const publicUrl = this.publicBase
        ? `${this.publicBase}/${key}`
        : result.Location;

      return {
        ok: true,
        publicUrl,
        signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        metadata: { size: stats.size, key, bucket: this.bucket },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

class NetlifyLMStorage {
  async upload(
    localPath: string,
    key: string,
    metadata: Record<string, string> = {},
  ): Promise<StorageResult> {
    const stats = statSync(localPath);

    return {
      ok: true,
      publicUrl: `https://${
        process.env.NETLIFY_SITE_DOMAIN || 'your-site.netlify.app'
      }/.netlify/large-media/${key}`,
      signedUrl: `https://${
        process.env.NETLIFY_SITE_DOMAIN || 'your-site.netlify.app'
      }/.netlify/large-media/${key}?token=placeholder`,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_SECONDS * 1000).toISOString(),
      metadata: { size: stats.size, key, backend: 'netlify_lm', ...metadata },
    };
  }
}

export function createStorage() {
  const backend = (process.env.STORAGE_BACKEND || 's3').toLowerCase();
  if (backend === 'netlify_lm') {
    return new NetlifyLMStorage();
  }
  return new S3Storage();
}
