import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { UserBankDetails } from '../dto/user-bank-details.dto';

type GraphqlContext = { req: { user?: User | null } };

@Resolver(() => UserBankDetails)
export class UserBankDetailsResolver {
  @ResolveField('accountNumber', () => String, {
    nullable: true,
    description: 'Full account number; exposed to admins only.',
  })
  accountNumber(
    @Parent() bankDetails: UserBankDetails,
    @Context() ctx: GraphqlContext,
  ): string | null {
    const user = ctx.req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      return null;
    }
    return bankDetails.fullAccountNumber ?? null;
  }
}
