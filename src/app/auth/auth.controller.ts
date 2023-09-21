import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { LocalAuthRequest } from './models/AuthRequest'
import { IS_PUBLIC_KEY, IsPublic } from './decorators/is-public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import { Registry } from '@/models/Registry'
import { Profile } from '@/models/Profile'
import { UserFromJwt } from './models/UserFromJwt'
import { ProfileService } from '../profile/profile.service'

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService
  ) {}

  @Post('login')
  @HttpCode(200)
  @IsPublic()
  @UseGuards(LocalAuthGuard)
  login(@Request() req: LocalAuthRequest) {
    return this.authService.login(req.user)
  }

  @Get('me')
  async getLogin(@CurrentUser() user: UserFromJwt) {
    const profile = await this.profileService.getById(user.profileId)
    return { ...profile, id: undefined, nicknameDigest: undefined }
  }
}
