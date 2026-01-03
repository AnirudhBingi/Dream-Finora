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
import { ListingService } from './listing.service';
import { CreateListingDto, ListingType, ListingStatus } from './dto/create-listing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CategorizationService } from '../shared/categorization.service';

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly categorizationService: CategorizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createListing(
    @CurrentUser() user: { userId: string },
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingService.createListing(user.userId, createListingDto);
  }

  @Get()
  async getListings(
    @CurrentUser() user: { userId: string },
    @Query('type') type?: ListingType,
    @Query('status') status?: ListingStatus,
    @Query('search') search?: string,
  ) {
    return this.listingService.getListings(user.userId, {
      type,
      status,
      search,
    });
  }

  @Get('my')
  async getMyListings(@CurrentUser() user: { userId: string }) {
    return this.listingService.getMyListings(user.userId);
  }

  @Get('categories')
  async getCategories() {
    return { categories: this.categorizationService.getItemCategories() };
  }

  @Get('suggest-category')
  async suggestCategory(@Query('title') title: string) {
    if (!title) {
      return { category: null };
    }
    const match = this.categorizationService.categorizeItem(title);
    return { category: match?.category || null };
  }

  @Get(':id')
  async getListingById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.listingService.getListingById(user.userId, id);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateListingStatus(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body('status') status: ListingStatus,
  ) {
    return this.listingService.updateListingStatus(user.userId, id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteListing(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.listingService.deleteListing(user.userId, id);
  }

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'listings');
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
  async uploadListingImages(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // For local development, return relative paths
    // In production, this would be uploaded to S3/Supabase Storage and return full URLs
    const imageUrls = files.map(
      (file) => `/uploads/listings/${file.filename}`,
    );

    // Update listing with new images
    return this.listingService.addListingImages(user.userId, id, imageUrls);
  }
}

