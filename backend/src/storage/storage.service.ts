import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { PinoLogger } from 'nestjs-pino';
import { AppConfig } from '../config/configuration';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(StorageService.name);

    const config = this.configService.get<AppConfig>('config', { infer: true })!;
    this.bucketName = config.gcp.storage?.bucketName || '';

    if (!this.bucketName) {
      this.logger.warn('GCS bucket name not configured. Storage operations will fail.');
    }

    // Initialize Storage client
    // In production (Cloud Run), it will use the service account automatically
    // In local dev, it will use Application Default Credentials if configured
    this.storage = new Storage({
      projectId: config.gcp.projectId,
    });
  }

  /**
   * Upload a file to Cloud Storage
   * @param file - File buffer or stream
   * @param fileName - Name/path for the file in the bucket
   * @param contentType - MIME type of the file
   * @returns The public URL path (gs://bucket/object or object path)
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    if (!this.bucketName) {
      throw new InternalServerErrorException('Storage bucket not configured');
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileHandle = bucket.file(fileName);

      await fileHandle.save(file, {
        metadata: {
          contentType,
        },
        // Make the file publicly readable (we'll use signed URLs instead for better security)
        // Actually, let's keep it private and use signed URLs
        public: false,
      });

      this.logger.info('File uploaded successfully', { fileName, bucketName: this.bucketName });

      // Return the object path (not a URL, just the path in the bucket)
      return fileName;
    } catch (error) {
      this.logger.error('Failed to upload file', { fileName, error });
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  /**
   * Generate a signed URL for a file in Cloud Storage
   * @param fileName - Path/name of the file in the bucket
   * @param expirationMinutes - URL expiration time in minutes (default: 60)
   * @returns Signed URL that can be used to access the file
   */
  async getSignedUrl(fileName: string, expirationMinutes = 60): Promise<string> {
    if (!this.bucketName) {
      throw new InternalServerErrorException('Storage bucket not configured');
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileHandle = bucket.file(fileName);

      // Check if file exists
      const [exists] = await fileHandle.exists();
      if (!exists) {
        throw new InternalServerErrorException('File not found in storage');
      }

      // Generate signed URL
      const [signedUrl] = await fileHandle.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000, // Convert minutes to milliseconds
      });

      return signedUrl;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('Failed to generate signed URL', { 
        fileName, 
        bucketName: this.bucketName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a file from Cloud Storage
   * @param fileName - Path/name of the file in the bucket
   */
  async deleteFile(fileName: string): Promise<void> {
    if (!this.bucketName) {
      throw new InternalServerErrorException('Storage bucket not configured');
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileHandle = bucket.file(fileName);

      await fileHandle.delete();

      this.logger.info('File deleted successfully', { fileName });
    } catch (error: any) {
      // If file doesn't exist, that's ok (idempotent)
      if (error.code === 404) {
        this.logger.debug('File not found for deletion (already deleted)', { fileName });
        return;
      }
      this.logger.error('Failed to delete file', { fileName, error });
      throw new InternalServerErrorException('Failed to delete file from storage');
    }
  }
}

