import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RideService } from './ride.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRide(
    @CurrentUser() user: { userId: string },
    @Body() createRideDto: CreateRideDto,
  ) {
    return this.rideService.createRide(user.userId, createRideDto);
  }

  @Get()
  async getRides(
    @CurrentUser() user: { userId: string },
    @Query('groupId') groupId?: string,
  ) {
    return this.rideService.getRides(user.userId, groupId);
  }

  @Get(':id')
  async getRideById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.rideService.getRideById(user.userId, id);
  }

  @Put(':id/join')
  @HttpCode(HttpStatus.OK)
  async joinRide(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.rideService.joinRide(user.userId, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateRide(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateRideDto: UpdateRideDto,
  ) {
    return this.rideService.updateRide(user.userId, id, updateRideDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteRide(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.rideService.deleteRide(user.userId, id);
  }

  @Get(':id/history')
  async getRideHistory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.rideService.getRideHistory(user.userId, id);
  }
}

