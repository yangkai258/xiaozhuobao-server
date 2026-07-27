import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import { promises as fs, createReadStream } from 'node:fs';
import * as path from 'node:path';
import { ApiException } from '../../common/filters/api.exception';
import { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  AI_ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_AI_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  STORAGE_DRIVER_LOCAL,
} from './storage.constants';
import { SignUrlInput, UploadInput } from './storage.schemas';

export interface UploadResult {
  id: string;
  objectKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  expiresAt: string | null;
}

export interface AiUploadResult {
  fileId: string;
  url: string;
  mime: string;
  size: number;
  name: string;
}

export interface SignUrlResult {
  signedUrl: string;
  expiresAt: string;
}

interface SignedTokenPayload {
  objectKey: string;
  exp: number;
}

@Injectable()
export class StorageService {
  private readonly localDir: string;
  private readonly publicBaseUrl: string;
  private readonly driver: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.localDir = path.resolve(process.cwd(), this.config.get<string>('STORAGE_LOCAL_DIR') ?? './storage-data');
    this.publicBaseUrl = this.config.get<string>('STORAGE_PUBLIC_BASE_URL') ?? '/api/v1/storage/files';
    this.driver = this.config.get<string>('STORAGE_DRIVER') ?? STORAGE_DRIVER_LOCAL;
  }

  async upload(input: UploadInput, user: AuthenticatedUser): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new ApiException(40001, '文件类型不允许: ' + input.mimeType, HttpStatus.BAD_REQUEST);
    }
    const buffer = Buffer.from(input.base64, 'base64');
    if (buffer.length === 0) {
      throw new ApiException(40001, '文件内容为空', HttpStatus.BAD_REQUEST);
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new ApiException(40002, '文件过大 (>' + MAX_UPLOAD_BYTES / 1024 / 1024 + 'MB)', HttpStatus.PAYLOAD_TOO_LARGE);
    }
    const objectKey = this.buildObjectKey(user.id, input.name);
    await fs.mkdir(path.dirname(this.resolvePath(objectKey)), { recursive: true });
    await fs.writeFile(this.resolvePath(objectKey), buffer);
    const record = await this.prisma.storedFile.create({
      data: {
        objectKey,
        originalName: input.name,
        mimeType: input.mimeType,
        sizeBytes: buffer.length,
        driver: this.driver,
        storageUrl: this.toPublicUrl(objectKey),
        uploadedById: user.id,
      },
    });
    return {
      id: record.id,
      objectKey: record.objectKey,
      url: record.storageUrl,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      originalName: record.originalName,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    };
  }

  async uploadAi(input: UploadInput, user: AuthenticatedUser): Promise<AiUploadResult> {
    if (!AI_ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new ApiException(50403, 'AI 对话不支持该附件类型: ' + input.mimeType, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    const buffer = Buffer.from(input.base64, 'base64');
    if (buffer.length === 0) {
      throw new ApiException(50403, 'AI 附件内容为空', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    if (buffer.length > MAX_AI_UPLOAD_BYTES) {
      throw new ApiException(50402, 'AI 附件过大 (>' + MAX_AI_UPLOAD_BYTES / 1024 / 1024 + 'MB)', HttpStatus.PAYLOAD_TOO_LARGE);
    }
    try {
      const objectKey = this.buildObjectKey(user.id, input.name);
      await fs.mkdir(path.dirname(this.resolvePath(objectKey)), { recursive: true });
      await fs.writeFile(this.resolvePath(objectKey), buffer);
      const record = await this.prisma.storedFile.create({
        data: {
          objectKey,
          originalName: input.name,
          mimeType: input.mimeType,
          sizeBytes: buffer.length,
          driver: this.driver,
          storageUrl: this.toPublicUrl(objectKey),
          uploadedById: user.id,
        },
      });
      return {
        fileId: record.id,
        url: record.storageUrl,
        mime: record.mimeType,
        size: record.sizeBytes,
        name: record.originalName,
      };
    } catch {
      throw new ApiException(50401, 'AI 附件上传失败', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  signUrl(input: SignUrlInput): SignUrlResult {
    const objectKey = this.extractObjectKey(input.url);
    if (!objectKey) {
      throw new ApiException(40004, 'URL 必须指向本服务的 storage files', HttpStatus.BAD_REQUEST);
    }
    const ttl = input.expiresIn ?? 600;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const signature = this.sign(objectKey, expiresAt);
    const signedUrl = this.toPublicUrl(objectKey) + '?exp=' + expiresAt + '&sig=' + signature;
    return { signedUrl, expiresAt: new Date(expiresAt * 1000).toISOString() };
  }

  verifySignedRequest(objectKey: string, exp: number | undefined, sig: string | undefined): boolean {
    if (!exp || !sig) {
      return false;
    }
    if (exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = this.sign(objectKey, exp);
    return expected === sig;
  }

  streamObject(objectKey: string): NodeJS.ReadableStream {
    return createReadStream(this.resolvePath(objectKey));
  }

  async resolveMetadata(objectKey: string): Promise<{ mimeType: string; sizeBytes: number } | null> {
    const record = await this.prisma.storedFile.findFirst({
      where: { objectKey, isDeleted: false },
      select: { mimeType: true, sizeBytes: true },
    });
    return record;
  }

  private buildObjectKey(userId: string, originalName: string): string {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    const safe = originalName.replace(/[^\w.-]+/g, '_').slice(0, 64) || 'file';
    return 'uploads/' + stamp + '/' + userId + '/' + randomBytes(6).toString('hex') + '-' + safe;
  }

  private toPublicUrl(objectKey: string): string {
    return this.publicBaseUrl + '/' + objectKey;
  }

  private extractObjectKey(url: string): string | null {
    const prefix = this.publicBaseUrl.replace(/\/$/, '');
    if (!url.startsWith(prefix + '/')) {
      return null;
    }
    return url.slice(prefix.length + 1);
  }

  private resolvePath(objectKey: string): string {
    const target = path.resolve(this.localDir, objectKey);
    if (!target.startsWith(this.localDir + path.sep) && target !== this.localDir) {
      throw new ApiException(40004, '非法的对象键', HttpStatus.BAD_REQUEST);
    }
    return target;
  }

  private sign(objectKey: string, exp: number): string {
    const payload: SignedTokenPayload = { objectKey, exp };
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }
}
