# GraphQL Module Structure Guide

This guide explains the recommended module structure for a NestJS GraphQL application.

## 📋 Overview

In GraphQL, the structure differs from REST API:
- **Resolvers** replace **Controllers** (handle GraphQL queries/mutations)
- **Services** remain the same (business logic layer)
- **Entities** are database models with GraphQL decorators
- **DTOs/Inputs** define GraphQL input types for mutations
- **Modules** organize everything by domain/feature

---

## 🏗️ Recommended Structure

### Domain-Based Module Organization

Each domain (tutor, student, etc.) should have its own module with a complete structure:

```
apps/api/src/app/
├── common/                          # Shared across all modules
│   ├── base-entities/
│   │   └── base.entity.ts
│   ├── dto/                         # Common DTOs/Inputs
│   ├── enums/                       # Common enums
│   ├── services/                    # Common services
│   └── scripts/
│       └── migration-helper.js
│
├── modules/                         # Domain modules
│   ├── tutor/                       # Tutor domain module
│   │   ├── entities/
│   │   │   └── tutor.entity.ts
│   │   ├── resolvers/
│   │   │   └── tutor.resolver.ts
│   │   ├── services/
│   │   │   └── tutor.service.ts
│   │   ├── dto/                     # GraphQL Input types
│   │   │   ├── create-tutor.input.dto.ts
│   │   │   └── update-tutor.input.dto.ts
│   │   ├── enums/                   # Module-specific enums
│   │   │   ├── tutor-certificsatio-status.enum.ts
│   │   │   └── tutor-specialization.enum.ts
│   │   └── tutor.module.ts
│   │
│   ├── student/                     # Student domain module
│   │   ├── entities/
│   │   │   └── student.entity.ts
│   │   ├── resolvers/
│   │   │   └── student.resolver.ts
│   │   ├── services/
│   │   │   └── student.service.ts
│   │   ├── dto/
│   │   │   ├── create-student.input.dto.ts
│   │   │   └── update-student.input.dto.ts
│   │   ├── enums/                   # Module-specific enums
│   │   │   └── student-status.enum.ts
│   │   └── student.module.ts
│   │
│   └── classes/                     # Classes domain module
│       ├── entities/
│       ├── resolvers/
│       ├── services/
│       ├── dto/
│       ├── enums/                   # Module-specific enums
│       └── classes.module.ts
│
├── database/                        # Database configuration
│   ├── database.module.ts
│   ├── database.config.ts
│   └── database-credentials.loader.ts
│
├── graphql/                         # GraphQL configuration
│   ├── graphql.module.ts
│   └── resolvers/
│       └── app.resolver.ts          # App-level queries
│
└── app.module.ts                    # Root module
```

---

## 📦 Module Components Explained

### 1. **Entities** (`entities/`)

Database models with GraphQL decorators. Extend `QBaseEntity` for common fields.

**Example: `tutor/entities/tutor.entity.ts`**
```typescript
import { Entity, Column } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { QBaseEntity } from '../../common/base-entities/base.entity';

@ObjectType()  // Makes it a GraphQL type
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column()
  lastName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bio: string;

  @Field()
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hourlyRate: number;

  @Field()
  @Column({ default: false })
  isVerified: boolean;
}
```

**Key Points:**
- `@ObjectType()` makes it available in GraphQL schema
- `@Field()` exposes properties to GraphQL
- `@HideField()` hides properties from GraphQL
- Extends `QBaseEntity` for common fields (id, version, dates, etc.)

---

### 2. **Resolvers** (`resolvers/`)

Handle GraphQL queries, mutations, and subscriptions. Similar to controllers in REST.

**Example: `tutor/resolvers/tutor.resolver.ts`**
```typescript
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Tutor } from '../entities/tutor.entity';
import { TutorService } from '../services/tutor.service';
import { CreateTutorInput } from '../dto/create-tutor.input';
import { UpdateTutorInput } from '../dto/update-tutor.input';

@Resolver(() => Tutor)
export class TutorResolver {
  constructor(private readonly tutorService: TutorService) {}

  // Query: Get all tutors
  @Query(() => [Tutor], { name: 'tutors' })
  async findAll(): Promise<Tutor[]> {
    return this.tutorService.findAll();
  }

  // Query: Get tutor by ID
  @Query(() => Tutor, { name: 'tutor', nullable: true })
  async findOne(@Args('id', { type: () => ID }) id: number): Promise<Tutor | null> {
    return this.tutorService.findOne(id);
  }

  // Mutation: Create tutor
  @Mutation(() => Tutor)
  async createTutor(
    @Args('input') createTutorInput: CreateTutorInput,
  ): Promise<Tutor> {
    return this.tutorService.create(createTutorInput);
  }

  // Mutation: Update tutor
  @Mutation(() => Tutor)
  async updateTutor(
    @Args('id', { type: () => ID }) id: number,
    @Args('input') updateTutorInput: UpdateTutorInput,
  ): Promise<Tutor> {
    return this.tutorService.update(id, updateTutorInput);
  }

  // Mutation: Delete tutor (soft delete)
  @Mutation(() => Boolean)
  async removeTutor(@Args('id', { type: () => ID }) id: number): Promise<boolean> {
    return this.tutorService.remove(id);
  }
}
```

**Key Points:**
- `@Resolver(() => Tutor)` links resolver to entity
- `@Query()` defines GraphQL queries
- `@Mutation()` defines GraphQL mutations
- `@Args()` gets arguments from GraphQL query/mutation
- Delegates business logic to service

---

### 3. **Services** (`services/`)

Business logic layer. Same as REST API - handles data operations, validation, etc.

**Example: `tutor/services/tutor.service.ts`**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tutor } from '../entities/tutor.entity';
import { CreateTutorInput } from '../dto/create-tutor.input';
import { UpdateTutorInput } from '../dto/update-tutor.input';

@Injectable()
export class TutorService {
  constructor(
    @InjectRepository(Tutor)
    private readonly tutorRepository: Repository<Tutor>,
  ) {}

  async findAll(): Promise<Tutor[]> {
    return this.tutorRepository.find({
      where: { deleted: false, active: true },
    });
  }

  async findOne(id: number): Promise<Tutor | null> {
    const tutor = await this.tutorRepository.findOne({
      where: { id, deleted: false },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${id} not found`);
    }

    return tutor;
  }

  async create(createTutorInput: CreateTutorInput): Promise<Tutor> {
    const tutor = this.tutorRepository.create(createTutorInput);
    return this.tutorRepository.save(tutor);
  }

  async update(id: number, updateTutorInput: UpdateTutorInput): Promise<Tutor> {
    const tutor = await this.findOne(id);
    Object.assign(tutor, updateTutorInput);
    return this.tutorRepository.save(tutor);
  }

  async remove(id: number): Promise<boolean> {
    const tutor = await this.findOne(id);
    tutor.deleted = true; // Soft delete
    await this.tutorRepository.save(tutor);
    return true;
  }
}
```

**Key Points:**
- `@Injectable()` makes it a NestJS provider
- Uses `@InjectRepository()` for TypeORM repositories
- Contains business logic (validation, data transformation, etc.)
- Can be used by multiple resolvers or other services

---

### 4. **DTOs/Inputs** (`dto/`)

GraphQL input types for mutations. Define the shape of data clients send.

**Example: `tutor/dto/create-tutor.input.dto.ts`**
```typescript
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateTutorInput {
  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ defaultValue: 0 })
  hourlyRate: number;

  @Field({ defaultValue: false })
  isVerified: boolean;
}
```

**Example: `tutor/dto/update-tutor.input.dto.ts`**
```typescript
import { InputType, PartialType } from '@nestjs/graphql';
import { CreateTutorInput } from './create-tutor.input.dto';

@InputType()
export class UpdateTutorInput extends PartialType(CreateTutorInput) {
  // All fields from CreateTutorInput are optional here
  // Can add additional fields if needed
}
```

**Key Points:**
- `@InputType()` makes it a GraphQL input type
- Used in `@Args()` in resolvers
- `PartialType()` makes all fields optional (useful for updates)

---

### 5. **Enums** (`enums/`)

Module-specific enums for GraphQL. Use `registerEnumType()` to make them available in the GraphQL schema.

**Example: `tutor/enums/tutor-status.enum.ts`**
```typescript
import { registerEnumType } from '@nestjs/graphql';

export enum TutorStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  VERIFIED = 'VERIFIED',
}

// Register enum with GraphQL
registerEnumType(TutorStatus, {
  name: 'TutorStatus',
  description: 'Status of a tutor in the system',
});
```

**Using enums in entities:**
```typescript
import { TutorStatus } from '../enums/tutor-status.enum';

@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  // ... other fields

  @Field(() => TutorStatus)
  @Column({ type: 'enum', enum: TutorStatus, default: TutorStatus.PENDING })
  status: TutorStatus;
}
```

**Using enums in DTOs:**
```typescript
import { TutorStatus } from '../enums/tutor-status.enum';

@InputType()
export class CreateTutorInput {
  // ... other fields

  @Field(() => TutorStatus, { defaultValue: TutorStatus.PENDING })
  status: TutorStatus;
}
```

**Key Points:**
- Use `registerEnumType()` to register with GraphQL
- Import and use in entities with `@Field(() => EnumType)`
- Can be used in DTOs for input validation
- Enums are automatically included in GraphQL schema

---

### 6. **Module File** (`tutor.module.ts`)

Wires everything together - imports, providers, exports.

**Example: `tutor/tutor.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from './entities/tutor.entity';
import { TutorResolver } from './resolvers/tutor.resolver';
import { TutorService } from './services/tutor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tutor])], // Register entity
  providers: [TutorResolver, TutorService],      // Register resolver & service
  exports: [TutorService],                        // Export service if used elsewhere
})
export class TutorModule {}
```

**Key Points:**
- `TypeOrmModule.forFeature([Tutor])` registers entity for dependency injection
- `providers` includes resolver and service
- `exports` makes service available to other modules

---

## 🔗 Module Integration

### Root Module (`app.module.ts`)

Import all domain modules:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { GraphqlModule } from './graphql/graphql.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { StudentModule } from './modules/student/student.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AppResolver } from './graphql/resolvers/app.resolver';

@Module({
  imports: [
    DatabaseModule,    // Database configuration
    GraphqlModule,    // GraphQL configuration
    TutorModule,      // Tutor domain
    StudentModule,    // Student domain
    ClassesModule,    // Classes domain
    // ... other modules
  ],
  providers: [AppResolver], // App-level resolvers
})
export class AppModule {}
```

---

## 🔄 REST vs GraphQL Comparison

| REST API | GraphQL |
|----------|---------|
| `Controller` | `Resolver` |
| `@Get()`, `@Post()`, etc. | `@Query()`, `@Mutation()` |
| `@Body()`, `@Param()` | `@Args()` |
| `DTO` (class) | `InputType` (class with `@InputType()`) |
| `Service` | `Service` (same) |
| `Entity` | `Entity` with `@ObjectType()` |

---

## 📝 Complete Example: Tutor Module

### File Structure
```
modules/tutor/
├── entities/
│   └── tutor.entity.ts
├── resolvers/
│   └── tutor.resolver.ts
├── services/
│   └── tutor.service.ts
├── dto/
│   ├── create-tutor.input.dto.ts
│   └── update-tutor.input.dto.ts
└── tutor.module.ts
```

### Generated GraphQL Schema

```graphql
type Query {
  tutors: [Tutor!]!
  tutor(id: ID!): Tutor
}

type Mutation {
  createTutor(input: CreateTutorInput!): Tutor!
  updateTutor(id: ID!, input: UpdateTutorInput!): Tutor!
  removeTutor(id: ID!): Boolean!
}

type Tutor {
  id: Int!
  version: Int!
  createdDate: DateTime!
  updatedDate: DateTime!
  m_id: String
  email: String!
  firstName: String!
  lastName: String!
  bio: String
  hourlyRate: Decimal!
  isVerified: Boolean!
}

input CreateTutorInput {
  email: String!
  firstName: String!
  lastName: String!
  bio: String
  hourlyRate: Float!
  isVerified: Boolean!
}

input UpdateTutorInput {
  email: String
  firstName: String
  lastName: String
  bio: String
  hourlyRate: Float
  isVerified: Boolean
}
```

---

## 🎯 Best Practices

### ✅ DO:

1. **One module per domain** (tutor, student, course, etc.)
2. **Keep resolvers thin** - delegate to services
3. **Use services for business logic** - reusable across resolvers
4. **Extend `QBaseEntity`** for common fields
5. **Use `@InputType()` for mutations** - separate from entities
6. **Export services** if used by other modules
7. **Use `@HideField()`** for sensitive/internal data
8. **Organize by feature/domain** - not by technical layer

### ❌ DON'T:

1. **Don't put business logic in resolvers** - use services
2. **Don't expose entities directly as inputs** - use `@InputType()`
3. **Don't create one giant module** - split by domain
4. **Don't mix REST controllers with GraphQL** - choose one approach
5. **Don't forget to register entities** in `TypeOrmModule.forFeature()`

---

## 🔍 Advanced Patterns

### Field Resolvers

Resolve specific fields that require additional logic:

```typescript
@Resolver(() => Tutor)
export class TutorResolver {
  // Field resolver for computed/related data
  @FieldResolver(() => String)
  fullName(@Parent() tutor: Tutor): string {
    return `${tutor.firstName} ${tutor.lastName}`;
  }

  // Field resolver for relationships
  @FieldResolver(() => [Session])
  async sessions(@Parent() tutor: Tutor): Promise<Session[]> {
    // Load related data
    return this.sessionService.findByTutorId(tutor.id);
  }
}
```

### Relationships

Handle entity relationships in GraphQL:

```typescript
// tutor.entity.ts
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  // ... fields

  @OneToMany(() => Session, session => session.tutor)
  @Field(() => [Session])
  sessions: Session[];
}
```

---

## 📚 Summary

**GraphQL Module Structure:**
```
modules/
└── Domain Module/
    ├── entities/        # Database models with @ObjectType()
    ├── resolvers/       # GraphQL queries/mutations (@Resolver)
    ├── services/        # Business logic (@Injectable)
    ├── dto/            # Input types for mutations (@InputType)
    ├── enums/          # Module-specific enums (registerEnumType)
    └── module.ts        # Module configuration
```

**Key Differences from REST:**
- Resolvers replace Controllers
- `@Query()` / `@Mutation()` replace `@Get()` / `@Post()`
- `@InputType()` for mutation inputs
- Entities need `@ObjectType()` to appear in schema

**Workflow:**
1. Create entity with `@ObjectType()`
2. Create service with business logic
3. Create resolver with `@Query()` / `@Mutation()`
4. Create input types for mutations
5. Wire everything in module file
6. Import module in `AppModule`

---

## 🔗 Related Documentation

- [GraphQL Schema Generation](./GRAPHQL_SCHEMA_GENERATION.md)
- [Base Entity](../apps/api/src/app/common/base-entities/base.entity.ts)
- [NestJS GraphQL Documentation](https://docs.nestjs.com/graphql/quick-start)

