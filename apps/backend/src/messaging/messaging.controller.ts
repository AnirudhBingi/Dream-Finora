import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  async getConversations(@CurrentUser() user: { userId: string }) {
    return this.messagingService.getConversations(user.userId);
  }

  @Get('conversations/:chatId/messages')
  async getMessages(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
  ) {
    return this.messagingService.getMessages(user.userId, chatId);
  }

  @Post('conversations/:chatId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.userId, chatId, sendMessageDto.content);
  }

  @Post('conversations/start')
  @HttpCode(HttpStatus.CREATED)
  async startConversation(
    @CurrentUser() user: { userId: string },
    @Query('userId') otherUserId: string,
    @Body() sendMessageDto?: SendMessageDto,
  ) {
    return this.messagingService.startConversation(
      user.userId,
      otherUserId,
      sendMessageDto?.content,
    );
  }

  @Put('conversations/:chatId/messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async editMessage(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    return this.messagingService.editMessage(user.userId, chatId, messageId, content);
  }

  @Delete('conversations/:chatId/messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.deleteMessage(user.userId, chatId, messageId);
  }

  @Put('conversations/:chatId/messages/:messageId/read')
  @HttpCode(HttpStatus.OK)
  async markMessageAsRead(
    @CurrentUser() user: { userId: string },
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.markMessageAsRead(user.userId, chatId, messageId);
  }
}

