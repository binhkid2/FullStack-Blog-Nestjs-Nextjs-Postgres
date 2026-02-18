import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q?: string,
  ) {
    return this.usersService.findAll(parseInt(page, 10), parseInt(pageSize, 10), q);
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: Request, @Res() res: Response) {
    const user = await this.usersService.create(dto);
    const { passwordHash, ...safe } = user as any;
    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('partials/flash', { type: 'success', message: `User "${safe.email}" created!` });
    }
    return res.json({ success: true, user: safe });
  }

  @Patch(':id')
  async updateName(
    @Param('id') id: string,
    @Body() dto: UpdateUserNameDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.usersService.updateName(id, dto);
    const { passwordHash, ...safe } = user as any;
    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('partials/flash', { type: 'success', message: `User "${safe.email}" renamed.` });
    }
    return res.json({ success: true, user: safe });
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.usersService.updateRole(id, dto);
    const { passwordHash, ...safe } = user as any;
    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('partials/flash', { type: 'success', message: `Role updated to ${safe.role}.` });
    }
    return res.json({ success: true, user: safe });
  }

  @Get('partials/table')
  async tablePartial(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q: string,
    @Res() res: Response,
  ) {
    const data = await this.usersService.findAll(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      q,
    );
    return res.render('partials/dashboard-user-table', { users: data.users });
  }
}
