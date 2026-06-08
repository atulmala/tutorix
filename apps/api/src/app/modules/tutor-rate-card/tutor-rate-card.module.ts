import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBankDetailsModule } from '../user-bank-details/user-bank-details.module';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorOfferingRateCardEntity } from './entities/tutor-offering-rate-card.entity';
import { TutorRateCardService } from './services/tutor-rate-card.service';
import { TutorRateCardMutationResolver } from './resolvers/tutor-rate-card-mutation.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([TutorOfferingRateCardEntity, TutorOfferingEntity, Tutor]),
    UserBankDetailsModule,
  ],
  providers: [TutorRateCardService, TutorRateCardMutationResolver],
  exports: [TutorRateCardService, TypeOrmModule],
})
export class TutorRateCardModule {}
