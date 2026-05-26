import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { PtAnswerEntity } from '../entities/pt-answer.entity';

type GraphqlContext = { req: { user?: User | null } };

@Resolver(() => PtAnswerEntity)
export class PtAnswerResolver {
  constructor(
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {}

  @ResolveField('answer', () => Boolean, {
    description:
      'Whether this option is correct. Exposed to admins and test tutors only.',
  })
  async answer(
    @Parent() ptAnswer: PtAnswerEntity,
    @Context() ctx: GraphqlContext,
  ): Promise<boolean> {
    const user = ctx.req.user;
    if (!user) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      return ptAnswer.answer;
    }

    const tutor = await this.tutorRepo.findOne({
      where: { userId: user.id, deleted: false },
    });
    if (tutor?.testTutor) {
      return ptAnswer.answer;
    }

    return false;
  }
}
