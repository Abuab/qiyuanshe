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
import { EducationAuthService } from './education-auth.service'

const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
if (!existsSync(uploadsDir)) {
  try {
    mkdirSync(uploadsDir, { recursive: true })
  } catch (_) {}
}

@Controller('education-auth')
export class EducationAuthController {
  constructor(
    private readonly service: EducationAuthService,
  ) {}

  /** 获取当前用户学历认证状态 */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req: any) {
    const userId = req.user.id || req.user.sub
    const data = await this.service.getStatus(userId)
    return Result.success(data)
  }

  /** 提交学历认证（证书图片文件 + 院校 + 学历） */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `education-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: { fileSize: 1024 * 1024 * 5 }, // 证书图片限制 5MB
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
    @Body() body: { school?: string; degree?: string },
  ) {
    const userId = req.user.id || req.user.sub
    const school = (body.school || '').trim()
    const degree = (body.degree || '').trim()
    if (!school) {
      return Result.error('请输入院校名称')
    }
    if (!degree) {
      return Result.error('请选择学历')
    }
    if (!file) {
      return Result.error('请上传证书图片')
    }
    const image = `/uploads/${file.filename}`
    const data = await this.service.submit(userId, { school, degree, image })
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
    const data = await this.service.adminList({
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
    @Body() body: { status: number; rejectReason?: string },
  ) {
    const data = await this.service.audit(id, body)
    return Result.success(data)
  }
}
