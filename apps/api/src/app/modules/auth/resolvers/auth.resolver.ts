import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginInput } from '../dto/login.dto';
import { RegisterInput } from '../dto/register.dto';
import { RefreshTokenInput } from '../dto/refresh-token.dto';
import { AuthResponse } from '../dto/auth-response.dto';
import { UserSignupInput } from '../dto/user-signup.input';
import { RegisterUserInput } from '../dto/register-user.input';
import { SetPasswordInput } from '../dto/set-password.input';
import { UpdateUserInput } from '../dto/update-user.input';
import { ForgotPasswordInput } from '../dto/forgot-password.input';
import { ResetPasswordInput } from '../dto/reset-password.input';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async register(@Args('input') input: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Mutation(() => User)
  async registerUser(
    @Args('input') input: RegisterUserInput,
  ): Promise<User> {
    return this.authService.registerUser(input);
  }

  @Mutation(() => Boolean)
  async setPassword(
    @Args('input') input: SetPasswordInput,
  ): Promise<boolean> {
    return this.authService.setPassword(input);
  }

  @Mutation(() => User)
  async updateUser(
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.authService.updateUser(input);
  }

  @Mutation(() => AuthResponse)
  async userSignup(
    @Args('input') input: UserSignupInput,
  ): Promise<AuthResponse> {
    return this.authService.userSignup(input);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('input') input: RefreshTokenInput,
  ): Promise<AuthResponse> {
    return this.authService.refreshToken(input.refreshToken);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Args('refreshToken') refreshToken: string,
  ): Promise<boolean> {
    await this.authService.logout(refreshToken);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: User): Promise<boolean> {
    await this.authService.logoutAll(user.id);
    return true;
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @Query(() => User, { nullable: true })
  async user(@Args('id', { type: () => ID }) id: string): Promise<User | null> {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return null;
    }
    return this.authService.findById(userId);
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Args('input') input: ForgotPasswordInput): Promise<boolean> {
    return this.authService.forgotPassword(input);
  }

  @Mutation(() => Boolean)
  async resetPassword(@Args('input') input: ResetPasswordInput): Promise<boolean> {
    return this.authService.resetPassword(input);
  }

  @Query(() => Boolean)
  async validateResetToken(@Args('token') token: string): Promise<boolean> {
    return this.authService.validateResetToken(token);
  }
}

