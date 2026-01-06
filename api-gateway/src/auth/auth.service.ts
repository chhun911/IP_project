import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SignupDto, LoginDto } from './dto/auth.dto';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  // In-memory user storage (replace with database in production)
  private users: Map<string, User> = new Map();

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    if (!name || !email || !password) {
      throw new BadRequestException('Missing required fields');
    }

    if (this.users.has(email)) {
      throw new ConflictException('User already exists');
    }

    const user: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      password: password, // In production, hash the password
    };

    this.users.set(email, user);
    
    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    };
  } 

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Missing credentials');
    }

    const user = this.users.get(email);

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    };
  }
}
