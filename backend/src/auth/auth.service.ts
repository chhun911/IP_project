import { Injectable, ConflictException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { SignupDto, LoginDto } from './dto/auth.dto';
import { UserDatabaseService } from './services/user-database.service';
import * as crypto from 'crypto';

/**
 * Bcrypt-compatible password hashing using Node.js built-in crypto module.
 * Uses scrypt (recommended by OWASP) with a random 16-byte salt.
 * Output format: $scrypt$<salt_hex>$<hash_hex>
 */
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLELISM = 1; // p

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`$scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
      },
    );
  });
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split('$'); // ['', 'scrypt', saltHex, hashHex]
    if (parts.length !== 4 || parts[1] !== 'scrypt') {
      return resolve(false);
    }
    const salt = Buffer.from(parts[2], 'hex');
    const existingHash = Buffer.from(parts[3], 'hex');
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM },
      (err, derivedKey) => {
        if (err) return reject(err);
        // Timing-safe comparison to prevent timing attacks
        resolve(crypto.timingSafeEqual(existingHash, derivedKey));
      },
    );
  });
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly userDb: UserDatabaseService) {}

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    if (!name || !email || !password) {
      throw new BadRequestException('Missing required fields');
    }

    // Check if user already exists
    const existing = await this.userDb.findByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    // Hash the password with scrypt before storing
    const passwordHash = await hashPassword(password);

    const user = await this.userDb.createUser(name, email, passwordHash);
    this.logger.log(`User registered: ${user.email}`);

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscriptionType: user.subscription_type || 'free',
        mealPlanGenerationsUsed: user.meal_plan_generations_used ?? 0,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Missing credentials');
    }

    const user = await this.userDb.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare provided password against the stored hash
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscriptionType: user.subscription_type || 'free',
        mealPlanGenerationsUsed: user.meal_plan_generations_used ?? 0,
      },
    };
  }

  async getImageUsage(userId: number) {
    const count = await this.userDb.getImageGenerationCount(userId);
    return {
      success: true,
      data: {
        used: count,
        limit: 5,
        remaining: Math.max(0, 5 - count),
      },
    };
  }

  async getMealPlanUsage(userId: number) {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Valid userId is required');
    }

    const usage = await this.userDb.getMealPlanUsage(userId);
    const limit = usage.subscriptionType === 'premium' ? null : 2;

    return {
      success: true,
      data: {
        subscriptionType: usage.subscriptionType,
        used: usage.used,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - usage.used),
      },
    };
  }
}
