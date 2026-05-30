import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBankDetailsEntity } from './entities/user-bank-details.entity';
import { UserBankDetailsService } from './services/user-bank-details.service';
import { UserBankDetailsResolver } from './resolvers/user-bank-details.resolver';
import { UserBankDetailsMutationResolver } from './resolvers/user-bank-details-mutation.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserBankDetailsEntity])],
  providers: [
    UserBankDetailsService,
    UserBankDetailsResolver,
    UserBankDetailsMutationResolver,
  ],
  exports: [UserBankDetailsService, TypeOrmModule],
})
export class UserBankDetailsModule {}
