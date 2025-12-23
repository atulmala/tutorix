import { Resolver, Query, ObjectType, Field } from '@nestjs/graphql';

// This ObjectType will be automatically included in the schema
@ObjectType()
export class HealthStatus {
  @Field(() => String)
  status: string;

  @Field(() => String)
  message: string;
}

@Resolver()
export class AppResolver {
  @Query(() => String, { description: 'A simple hello query' })
  hello(): string {
    return 'Hello from GraphQL!';
  }

  @Query(() => HealthStatus, { description: 'Get API health status' })
  health(): HealthStatus {
    return {
      status: 'ok',
      message: 'API is healthy',
    };
  }
}
