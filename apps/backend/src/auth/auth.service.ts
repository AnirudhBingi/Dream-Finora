import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, mobileNumber } = registerDto;

    // Check if user already exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if mobile number is already taken (if provided)
    if (mobileNumber) {
      const existingUserByMobile = await this.prisma.user.findUnique({
        where: { mobileNumber },
      });

      if (existingUserByMobile) {
        throw new ConflictException(
          'User with this mobile number already exists',
        );
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        mobileNumber: mobileNumber || null,
        password: hashedPassword,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = this.jwtService.sign({ userId: user.id, email: user.email });

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // Determine if identifier is email or mobile number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    // Find user by email or mobile number
    const user = isEmail
      ? await this.prisma.user.findUnique({
          where: { email: identifier },
        })
      : await this.prisma.user.findUnique({
          where: { mobileNumber: identifier },
        });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email/mobile number or password',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Invalid email/mobile number or password',
      );
    }

    // Generate JWT token
    const token = this.jwtService.sign({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        mobileNumber: user.mobileNumber,
        createdAt: user.createdAt,
      },
      token,
    };
  }
}
