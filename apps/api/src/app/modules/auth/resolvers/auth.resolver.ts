import { Resolver, Mutation, Query, Args, ID, Parent, ResolveField } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { ProfilePictureService } from '../services/profile-picture.service';
import { SessionService } from '../services/session.service';
import { SessionStats } from '../dto/session-stats.dto';
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
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  ConfirmProfilePictureUploadInput,
  ProfilePictureUploadUrlResult,
} from '../dto/profile-picture-upload.dto';
import { RequestProfilePictureUploadUrlInput } from '../dto/request-profile-picture-upload-url.input';

@Resolver(() => User)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly profilePictureService: ProfilePictureService,
  ) {}

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
    return this.authService.refreshToken(input.refreshToken, input.platform);
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
    const fresh = await this.authService.findById(user.id);
    return fresh ?? user;
  }

  /** Heartbeat: keeps session marked as active. Call periodically (e.g. every 2 min) when app is in foreground. */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async heartbeat(): Promise<boolean> {
    return true;
  }

  /** Session stats: total, active (activity in last 5 min), inactive. Admin only. */
  @Query(() => SessionStats)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async sessionStats(): Promise<SessionStats> {
    return this.sessionService.getSessionStats();
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

  @Mutation(() => ProfilePictureUploadUrlResult, {
    description: 'Get a presigned S3 PUT URL for profile picture upload',
  })
  @UseGuards(JwtAuthGuard)
  async requestProfilePictureUploadUrl(
    @CurrentUser() user: User,
    @Args('input') input: RequestProfilePictureUploadUrlInput,
  ): Promise<ProfilePictureUploadUrlResult> {
    return this.profilePictureService.requestUploadUrl(user, input);
  }

  @Mutation(() => User, {
    description: 'Confirm profile picture upload after S3 PUT',
  })
  @UseGuards(JwtAuthGuard)
  async confirmProfilePictureUpload(
    @CurrentUser() user: User,
    @Args('input') input: ConfirmProfilePictureUploadInput,
  ): Promise<User> {
    return this.profilePictureService.confirmUpload(user, input);
  }

  @ResolveField('profilePicture', () => String, {
    nullable: true,
    description: 'HTTPS URL for small profile picture thumbnail',
  })
  async profilePicture(@Parent() user: User): Promise<string | null> {
    return this.profilePictureService.resolveDisplayUrl(user.profilePicture);
  }

  @ResolveField('profilePictureThumbnailMedium', () => String, {
    nullable: true,
    description: 'HTTPS URL for medium profile picture thumbnail',
  })
  async profilePictureThumbnailMedium(@Parent() user: User): Promise<string | null> {
    return this.profilePictureService.resolveDisplayUrl(
      user.profilePictureThumbnailMedium,
    );
  }

  @ResolveField('profilePictureThumbnailLarge', () => String, {
    nullable: true,
    description: 'HTTPS URL for large profile picture thumbnail',
  })
  async profilePictureThumbnailLarge(@Parent() user: User): Promise<string | null> {
    return this.profilePictureService.resolveDisplayUrl(
      user.profilePictureThumbnailLarge,
    );
  }

  @ResolveField('profilePictureOriginalUrl', () => String, {
    nullable: true,
    description: 'HTTPS URL for original profile picture',
  })
  async profilePictureOriginalUrl(@Parent() user: User): Promise<string | null> {
    return this.profilePictureService.resolveDisplayUrl(user.profilePictureOriginalUrl);
  }
}

