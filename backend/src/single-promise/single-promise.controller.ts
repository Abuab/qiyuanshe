import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'
import { SinglePromiseService } from './single-promise.service'

const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
if (!existsSync(uploadsDir)) {
  try { mkdirSync(uploadsDir, { recursive: true }) } catch (_) {}
}

@Controller('single-promise')
export class SinglePromiseController {
  constructor(private readonly spService: SinglePromiseService) {}

  /** 获取当前用户单身承诺状态 */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req: any) {
    const userId = req.user.id || req.user.sub
    const data = await this.spService.getStatus(userId)
    return Result.success(data)
  }

  /** 提交单身承诺（签名图片文件上传） */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `signature-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: { fileSize: 1024 * 1024 * 2 }, // 签名图片限制 2MB
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传 png/jpg 格式'), false)
        }
      },
    }),
  )
  async submit(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body('realName') realName?: string,
  ) {
    const userId = req.user.id || req.user.sub
    if (!file) {
      return Result.error('请上传签名图片')
    }
    const signatureUrl = `/uploads/${file.filename}`
    const data = await this.spService.submit(userId, signatureUrl, realName)
    return Result.success(data)
  }

  /** 管理后台：查询列表 */
  @Get('admin/list')
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
  async adminList(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: number,
  ) {
    const data = await this.spService.adminList({
      page: +page,
      pageSize: +pageSize,
      status: status !== undefined ? +status : undefined,
    })
    return Result.success(data)
  }

  /** 管理后台：审核 */
  @Put('admin/audit/:id')
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
  async audit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: number; rejectReason?: string; adminId?: number },
  ) {
    const data = await this.spService.audit(id, body)
    return Result.success(data)
  }
}
