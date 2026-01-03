import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('trust-score')
@UseGuards(JwtAuthGuard)
export class TrustScoreController {
  constructor(private readonly trustScoreService: TrustScoreService) {}

  @Get()
  async getTrustScore(@CurrentUser() user: { userId: string }) {
    const trustScore = await this.trustScoreService.getOrCreateTrustScore(
      user.userId,
    );
    return trustScore;
  }

  @Get('history')
  async getTrustScoreHistory(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const history = await this.trustScoreService.getTrustScoreHistory(user.userId, limitNum);
    return { history };
  }

  @Get('breakdown')
  async getTrustScoreBreakdown(@CurrentUser() user: { userId: string }) {
    const trustScoreWithBreakdown = await this.trustScoreService.getTrustScoreWithBreakdown(
      user.userId,
    );
    return trustScoreWithBreakdown;
  }

  @Get('compare')
  async compareTrustScore(@CurrentUser() user: { userId: string }) {
    return this.trustScoreService.compareTrustScoreWithFriends(user.userId);
  }

  @Get('insights')
  async getTrustScoreInsights(@CurrentUser() user: { userId: string }) {
    return this.trustScoreService.getTrustScoreInsights(user.userId);
  }
}

