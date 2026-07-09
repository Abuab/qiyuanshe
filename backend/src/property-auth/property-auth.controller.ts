import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { PropertyAuthService } from './property-auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Result } from '../common/result'

const uploadStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname || '.jpg')
    const name = `property-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, name)
  },
})

@Controller('property-auth')
export class PropertyAuthController {
  constructor(
    private readonly service: PropertyAuthService,
  ) {}

  /** 小程序：获取房产认证状态 */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Request() req: any) {
    const userId = req.user?.id
    if (!userId) {
      return Result.error('请先登录', 401)
    }
    const data = await this.service.getStatus(userId)
    return Result.success(data)
  }

  /** 小程序：提交房产认证（含图片上传） */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage }))
  async submit(
    @Request() req: any,
    @UploadedFile() file: any,
  ) {
    const userId = req.user?.id
    if (!userId) {
      return Result.error('请先登录', 401)
    }
    if (!file) {
      return Result.error('请上传房产证明图片', 400)
    }

    const image = `/uploads/${file.filename}`
    const data = await this.service.submit(userId, { image })
    return Result.success(data)
  }

  /** 管理后台：分页查询 */
  @Get('admin/list')
  async adminList(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('status') status: string,
  ) {
    const data = await this.service.adminList({ page, pageSize, status })
    return Result.success(data)
  }

  /** 管理后台：审核 */
  @Post('admin/audit')
  async adminAudit(
    @Body() body: { id: number; status: number; rejectReason?: string },
  ) {
    if (!body.id || body.status === undefined || body.status === null) {
      throw new HttpException('缺少参数', HttpStatus.BAD_REQUEST)
    }
    const data = await this.service.audit(body.id, {
      status: body.status,
      rejectReason: body.rejectReason,
    })
    return Result.success(data)
  }
}
