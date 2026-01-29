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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @CurrentUser() user: { userId: string },
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postService.createPost(user.userId, createPostDto);
  }

  @Get()
  async getPosts(
    @CurrentUser() user: { userId: string },
    @Query('userId') userId?: string,
    @Query('groupId') groupId?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.postService.getPosts(user.userId, {
      userId,
      groupId,
      search,
      cursor,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  @Get(':id')
  async getPostById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.postService.getPostById(user.userId, id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updatePost(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postService.updatePost(user.userId, id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePost(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.postService.deletePost(user.userId, id);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async toggleLike(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.postService.toggleLike(user.userId, id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.postService.getComments(id);
  }

  @Get(':id/likes')
  async getLikes(@Param('id') id: string) {
    return this.postService.getLikes(id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.postService.addComment(user.userId, id, content);
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postService.deleteComment(user.userId, id, commentId);
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  async sharePost(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.postService.sharePost(user.userId, id);
  }

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'posts');
          // Create directory if it doesn't exist
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadPostImages(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // For local development, return relative paths
    // In production, this would be uploaded to S3/Supabase Storage and return full URLs
    const imageUrls = files.map((file) => `/uploads/posts/${file.filename}`);

    // Update post with new images
    return this.postService.addPostImages(user.userId, id, imageUrls);
  }
}
