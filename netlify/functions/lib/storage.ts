import { createReadStream, statSync, readFileSync } from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStore } from '@netlify/blobs';

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
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || '';
    this.publicBase = process.env.S3_PUBLIC_BASE_URL;
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async upload(
    localPath: string,
    key: string,
    opts: { maxMb?: number; metadata?: Record<string, string> } = {}
  ): Promise<StorageResult> {
    const { maxMb = DEFAULT_MAX_MB, metadata = {} } = opts;

    try {
      const stats = statSync(localPath);
      if (stats.size > maxMb * 1024 * 1024) {
        return {
          ok: false,
          error: `File exceeds ${maxMb}MB limit (actual: ${(stats.size / (1024 * 1024)).toFixed(2)}MB)`,
        };
      }

      const fileStream = createReadStream(localPath);
      const contentType = resolveContentType(localPath);

      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        Metadata: metadata,
      };

      await this.s3.send(new PutObjectCommand(uploadParams));

      const publicUrl = this.publicBase
        ? `${this.publicBase}/${key}`
        : `https://${this.bucket}.s3.amazonaws.com/${key}`;

      return {
        ok: true,
        publicUrl,
        metadata: { contentType, size: stats.size, key },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRY_SECONDS
  ): Promise<StorageResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      return { ok: true, signedUrl, expiresAt };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * MockStorage - Local filesystem fallback for development
 * Simulates S3 behavior without requiring AWS credentials
 */
class MockStorage {
  async upload(
    localPath: string,
    key: string,
    opts: { maxMb?: number; metadata?: Record<string, string> } = {}
  ): Promise<StorageResult> {
    const { maxMb = DEFAULT_MAX_MB } = opts;

    try {
      const stats = statSync(localPath);
      if (stats.size > maxMb * 1024 * 1024) {
        return {
          ok: false,
          error: `File exceeds ${maxMb}MB limit`,
        };
      }

      // Mock URL for local development
      const publicUrl = `file://${localPath}`;

      console.log(`[MockStorage] Would upload ${localPath} to s3://${key}`);

      return {
        ok: true,
        publicUrl,
        metadata: {
          mock: true,
          key,
          size: stats.size,
          contentType: resolveContentType(localPath),
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRY_SECONDS
  ): Promise<StorageResult> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log(`[MockStorage] Would generate signed URL for ${key}`);

    return {
      ok: true,
      signedUrl: `mock://signed/${key}?expires=${expiresIn}`,
      expiresAt,
    };
  }
}

/**
 * Netlify Large Media Storage - Uses Netlify's built-in large file storage
 */
class NetlifyLMStorage {
  async upload(
    localPath: string,
    key: string,
    opts: { maxMb?: number; metadata?: Record<string, string> } = {}
  ): Promise<StorageResult> {
    const stats = statSync(localPath);
    const domain = process.env.NETLIFY_SITE_DOMAIN || 'sirtrav-a2a-studio.netlify.app';

    return {
      ok: true,
      publicUrl: `https://${domain}/.netlify/large-media/${key}`,
      signedUrl: `https://${domain}/.netlify/large-media/${key}?token=placeholder`,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_SECONDS * 1000).toISOString(),
      metadata: { size: stats.size, key, backend: 'netlify_lm' },
    };
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRY_SECONDS
  ): Promise<StorageResult> {
    const domain = process.env.NETLIFY_SITE_DOMAIN || 'sirtrav-a2a-studio.netlify.app';
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      ok: true,
      signedUrl: `https://${domain}/.netlify/large-media/${key}?token=placeholder`,
      expiresAt,
    };
  }
}

/**
 * Netlify Blobs Storage - Modern key-value storage built into Netlify
 * Best for: Videos, audio, images, JSON data
 * No AWS setup required!
 */
class NetlifyBlobsStorage {
  private storeName: string;

  constructor(storeName: string = 'sirtrav-media') {
    this.storeName = storeName;
  }

  /**
   * Upload a file to Netlify Blobs
   */
  async upload(
    localPath: string,
    key: string,
    opts: { maxMb?: number; metadata?: Record<string, string> } = {}
  ): Promise<StorageResult> {
    const { maxMb = DEFAULT_MAX_MB, metadata = {} } = opts;

    try {
      const stats = statSync(localPath);
      if (stats.size > maxMb * 1024 * 1024) {
        return {
          ok: false,
          error: `File exceeds ${maxMb}MB limit (actual: ${(stats.size / (1024 * 1024)).toFixed(2)}MB)`,
        };
      }

      const store = getStore(this.storeName);
      const fileBuffer = readFileSync(localPath);
      const contentType = resolveContentType(localPath);

      // Store the file with metadata
      await store.set(key, fileBuffer, {
        metadata: {
          ...metadata,
          contentType,
          size: String(stats.size),
          uploadedAt: new Date().toISOString(),
        },
      });

      const domain = process.env.URL || 'https://sirtrav-a2a-studio.netlify.app';
      const publicUrl = `${domain}/.netlify/blobs/${this.storeName}/${key}`;

      console.log(`[NetlifyBlobs] Uploaded ${key} (${(stats.size / 1024).toFixed(1)}KB)`);

      return {
        ok: true,
        publicUrl,
        metadata: { contentType, size: stats.size, key, backend: 'netlify_blobs' },
      };
    } catch (err) {
      console.error('[NetlifyBlobs] Upload error:', err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Upload raw data (Buffer or string) directly
   */
  async uploadData(
    key: string,
    data: Buffer | string,
    opts: { contentType?: string; metadata?: Record<string, string> } = {}
  ): Promise<StorageResult> {
    const { contentType = 'application/octet-stream', metadata = {} } = opts;

    try {
      const store = getStore(this.storeName);
      const buffer = typeof data === 'string' ? Buffer.from(data) : data;

      await store.set(key, buffer, {
        metadata: {
          ...metadata,
          contentType,
          size: String(buffer.length),
          uploadedAt: new Date().toISOString(),
        },
      });

      const domain = process.env.URL || 'https://sirtrav-a2a-studio.netlify.app';
      const publicUrl = `${domain}/.netlify/blobs/${this.storeName}/${key}`;

      console.log(`[NetlifyBlobs] Uploaded data ${key} (${(buffer.length / 1024).toFixed(1)}KB)`);

      return {
        ok: true,
        publicUrl,
        metadata: { contentType, size: buffer.length, key, backend: 'netlify_blobs' },
      };
    } catch (err) {
      console.error('[NetlifyBlobs] Upload data error:', err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Get a file from Netlify Blobs
   */
  async get(key: string): Promise<{ ok: boolean; data?: Buffer; metadata?: Record<string, string>; error?: string }> {
    try {
      const store = getStore(this.storeName);
      const blob = await store.get(key, { type: 'arrayBuffer' });
      
      if (!blob) {
        return { ok: false, error: 'File not found' };
      }

      const metadata = await store.getMetadata(key);

      return {
        ok: true,
        data: Buffer.from(blob),
        metadata: metadata?.metadata as Record<string, string>,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Delete a file from Netlify Blobs
   */
  async delete(key: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const store = getStore(this.storeName);
      await store.delete(key);
      console.log(`[NetlifyBlobs] Deleted ${key}`);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * List all files in the store
   */
  async list(prefix?: string): Promise<{ ok: boolean; keys?: string[]; error?: string }> {
    try {
      const store = getStore(this.storeName);
      const { blobs } = await store.list({ prefix });
      const keys = blobs.map((b: { key: string }) => b.key);
      return { ok: true, keys };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Get signed URL (Netlify Blobs are public by default, so this returns the public URL)
   */
  async getSignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRY_SECONDS
  ): Promise<StorageResult> {
    const domain = process.env.URL || 'https://sirtrav-a2a-studio.netlify.app';
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      ok: true,
      signedUrl: `${domain}/.netlify/blobs/${this.storeName}/${key}`,
      publicUrl: `${domain}/.netlify/blobs/${this.storeName}/${key}`,
      expiresAt,
    };
  }
}

// Pre-configured blob stores for different media types
export const videoStore = new NetlifyBlobsStorage('sirtrav-videos');
export const audioStore = new NetlifyBlobsStorage('sirtrav-audio');
export const imageStore = new NetlifyBlobsStorage('sirtrav-images');
export const creditsStore = new NetlifyBlobsStorage('sirtrav-credits');

/**
 * Factory function to create appropriate storage backend
 * Priority: netlify_blobs > s3 > netlify_lm > mock
 */
export function createStorage(storeName?: string) {
  const backend = (process.env.STORAGE_BACKEND || 'netlify_blobs').toLowerCase();
  
  // Netlify Blobs - RECOMMENDED for Netlify deployments (no AWS setup!)
  if (backend === 'netlify_blobs' || backend === 'blobs') {
    console.log('[Storage] Using Netlify Blobs backend');
    return new NetlifyBlobsStorage(storeName || 'sirtrav-media');
  }
  
  if (backend === 's3' && process.env.AWS_ACCESS_KEY_ID) {
    console.log('[Storage] Using S3 backend');
    return new S3Storage();
  }
  
  if (backend === 'netlify_lm') {
    console.log('[Storage] Using Netlify Large Media backend');
    return new NetlifyLMStorage();
  }
  
  // Default: Netlify Blobs (works out of the box on Netlify!)
  console.log('[Storage] Defaulting to Netlify Blobs backend');
  return new NetlifyBlobsStorage(storeName || 'sirtrav-media');
}

// Export appropriate storage based on environment
const isProduction = process.env.NODE_ENV === 'production';
const hasS3Config = Boolean(
  process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
);

// Default storage instance - uses Netlify Blobs on Netlify, Mock locally
export const storage = isProduction 
  ? (hasS3Config ? new S3Storage() : new NetlifyBlobsStorage('sirtrav-media'))
  : new MockStorage();

export { S3Storage, MockStorage, NetlifyLMStorage, NetlifyBlobsStorage };

