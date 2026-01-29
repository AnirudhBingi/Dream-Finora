import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('finscore')
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
    const history = await this.trustScoreService.getTrustScoreHistory(
      user.userId,
      limitNum,
    );
    return { history };
  }

  @Get('rank-history')
  async getRankHistory(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
    @Query('category') category?: 'overall' | 'expense' | 'chore' | 'community',
    @Query('period') period?: 'all-time' | 'weekly' | 'monthly',
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    const history = await this.trustScoreService.getRankHistory(user.userId, {
      limit: limitNum,
      category: category || 'overall',
      period: period || 'all-time',
    });
    return { history };
  }

  @Get('breakdown')
  async getTrustScoreBreakdown(@CurrentUser() user: { userId: string }) {
    const trustScoreWithBreakdown =
      await this.trustScoreService.getTrustScoreWithBreakdown(user.userId);
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

  @Get('leaderboard')
  async getLeaderboard(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('category') category?: 'overall' | 'expense' | 'chore' | 'community',
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const leaderboard = await this.trustScoreService.getLeaderboard({
      limit: limitNum,
      offset: offsetNum,
      category: category || 'overall',
    });

    // Get user's rank
    const userRank = await this.trustScoreService.getUserRank(
      user.userId,
      category || 'overall',
    );

    return {
      ...leaderboard,
      userRank,
    };
  }

  @Get('leaderboard/friends')
  async getFriendsLeaderboard(@CurrentUser() user: { userId: string }) {
    return this.trustScoreService.getFriendsLeaderboard(user.userId);
  }

  @Get('leaderboard/position')
  async getUserPosition(
    @CurrentUser() user: { userId: string },
    @Query('category') category?: 'overall' | 'expense' | 'chore' | 'community',
  ) {
    const rank = await this.trustScoreService.getUserRank(
      user.userId,
      category || 'overall',
    );

    // Get total users in leaderboard
    const leaderboard = await this.trustScoreService.getLeaderboard({
      limit: 1,
      offset: 0,
      category: category || 'overall',
    });

    return {
      rank,
      totalUsers: leaderboard.total,
      percentile:
        rank && leaderboard.total > 0
          ? Math.round((1 - rank / leaderboard.total) * 100)
          : null,
    };
  }

  @Get('share-rank')
  async getShareRank(
    @CurrentUser() user: { userId: string },
    @Query('category') category?: 'overall' | 'expense' | 'chore' | 'community',
  ) {
    return this.trustScoreService.getShareRank(
      user.userId,
      category || 'overall',
    );
  }
}
