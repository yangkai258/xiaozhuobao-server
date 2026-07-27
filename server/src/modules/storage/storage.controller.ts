import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiException } from '../../common/filters/api.exception';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import { SignUrlInput, UploadInput, signUrlInputSchema, uploadInputSchema } from './storage.schemas';
import { SignUrlResult, StorageService } from './storage.service';

@ApiTags('存储')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @HttpCode(201)
  @ApiBearerAuth()
  @ApiOperation({ summary: '上传文件（base64 JSON 体）' })
  upload(
    @Body(new ZodValidationPipe(uploadInputSchema)) body: UploadInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.storage.upload(body, user);
  }

  @Post('upload-ai')
  @HttpCode(201)
  @ApiBearerAuth()
  @ApiOperation({ summary: '上传 AI 对话附件（≤8MB，仅 image/jpeg、image/png、application/pdf）' })
  uploadAi(
    @Body(new ZodValidationPipe(uploadInputSchema)) body: UploadInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.storage.uploadAi(body, user);
  }

  @Post('sign-url')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: '为私有文件生成临时签名 URL' })
  signUrl(@Body(new ZodValidationPipe(signUrlInputSchema)) body: SignUrlInput): SignUrlResult {
    return this.storage.signUrl(body);
  }

  @Public()
  @Get('files/*')
  @ApiOperation({ summary: '通过签名 URL 下载文件（内部接口）' })
  async download(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ): Promise<void> {
    const params = request.params as Record<string, string | string[]>;
    const wildcard = params['0'];
    const objectKey = Array.isArray(wildcard) ? wildcard.join('/') : wildcard;
    if (!objectKey) {
      throw new ApiException(10404, '文件不存在', HttpStatus.NOT_FOUND);
    }
    const expRaw = request.query['exp'];
    const sigRaw = request.query['sig'];
    const expParam = Array.isArray(expRaw) ? expRaw[0] : expRaw;
    const sigParam = Array.isArray(sigRaw) ? sigRaw[0] : sigRaw;
    const exp = typeof expParam === 'string' ? Number(expParam) : 0;
    const sig = typeof sigParam === 'string' ? sigParam : '';
    if (!Number.isFinite(exp) || !this.storage.verifySignedRequest(objectKey, exp, sig)) {
      throw new ApiException(10422, '签名无效或已过期', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const meta = await this.storage.resolveMetadata(objectKey);
    if (!meta) {
      throw new ApiException(10404, '文件不存在', HttpStatus.NOT_FOUND);
    }
    response.setHeader('Content-Type', meta.mimeType);
    response.setHeader('Content-Length', String(meta.sizeBytes));
    const stream = this.storage.streamObject(objectKey);
    stream.on('error', () => {
      response.status(HttpStatus.NOT_FOUND).end();
    });
    stream.pipe(response);
  }
}
