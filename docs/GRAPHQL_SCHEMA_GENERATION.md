# GraphQL Schema Generation Guide

This guide explains how GraphQL schema is automatically generated in your NestJS application using the code-first approach.

## 📋 Overview

Your project uses **code-first GraphQL schema generation**, which means:
- You write TypeScript code with decorators (`@ObjectType`, `@Field`, `@Query`, etc.)
- NestJS automatically generates the GraphQL schema file (`schema.gql`)
- The schema is generated **automatically when the application starts**

---

## 🔄 When Schema Generation Happens

### Automatic Generation on App Start

The schema is generated **every time you start the API**:

```bash
npm run serve:api
```

**What happens:**
1. NestJS application boots up
2. GraphQL module initializes
3. Scans all files for GraphQL decorators
4. Generates `schema.gql` file at `apps/api/src/schema.gql`
5. Application starts with the generated schema

**Configuration** (from `graphql.module.ts`):
```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(__dirname, '../../schema.gql'), // ← Schema file location
  sortSchema: true,                                    // ← Alphabetically sorts types
  playground: process.env.NODE_ENV !== 'production',
  introspection: true,
})
```

---

## 🎯 What Gets Included in the Schema

The schema generator scans your codebase and includes:

### 1. **Resolvers** (`@Resolver`, `@Query`, `@Mutation`, `@Subscription`)

**Example:**
```typescript
// apps/api/src/app/graphql/resolvers/app.resolver.ts
@Resolver()
export class AppResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello from GraphQL!';
  }

  @Query(() => HealthStatus)
  health(): HealthStatus {
    return { status: 'ok', message: 'API is healthy' };
  }
}
```

**Generated Schema:**
```graphql
type Query {
  hello: String!
  health: HealthStatus!
}
```

### 2. **Object Types** (`@ObjectType`, `@Field`)

**Example:**
```typescript
@ObjectType()
export class HealthStatus {
  @Field(() => String)
  status: string;

  @Field(() => String)
  message: string;
}
```

**Generated Schema:**
```graphql
type HealthStatus {
  status: String!
  message: String!
}
```

### 3. **Entities with `@ObjectType` Decorator**

**Important:** Only entities with `@ObjectType()` decorator are included in the GraphQL schema.

**Example - Base Entity:**
```typescript
// apps/api/src/app/common/base-entities/base.entity.ts
@ObjectType({ isAbstract: true })
export abstract class QBaseEntity extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @VersionColumn()
  version: number;

  @HideField()  // ← Hidden from GraphQL
  @Column({ default: false })
  deleted: boolean;

  @Field()
  @CreateDateColumn()
  createdDate: Date;
  // ...
}
```

**Note:** `@ObjectType({ isAbstract: true })` means this type won't appear directly in the schema, but fields will be inherited by child types.

**Example - Concrete Entity:**
```typescript
// apps/api/src/app/tutor/entities/tutor.entity.ts
@ObjectType()  // ← This makes it a GraphQL type
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  firstName: string;

  @HideField()  // ← Hidden from GraphQL
  @Column()
  internalNote: string;
}
```

**Generated Schema:**
```graphql
type Tutor {
  id: Int!
  version: Int!
  createdDate: DateTime!
  updatedDate: DateTime!
  m_id: String
  email: String!
  firstName: String!
  # internalNote is NOT included (has @HideField)
}
```

---

## 📁 Schema File Location

**Generated File:** `apps/api/src/schema.gql`

**Why it's gitignored:**
- The file is auto-generated
- It changes every time you modify decorators
- Source of truth is your TypeScript code, not the schema file

**To view the schema:**
1. Start the API: `npm run serve:api`
2. Open the file: `apps/api/src/schema.gql`
3. Or use GraphQL Playground: `http://localhost:3000/api/graphql`

---

## 🔍 How Schema Generation Works

### Step-by-Step Process

1. **Application Boot**
   ```typescript
   // main.ts
   const app = await NestFactory.create(AppModule);
   ```

2. **Module Initialization**
   ```typescript
   // AppModule imports GraphqlModule
   imports: [GraphqlModule]
   ```

3. **GraphQL Module Scans Codebase**
   - Looks for `@Resolver()` classes
   - Looks for `@ObjectType()` classes
   - Looks for `@Field()` decorators
   - Looks for `@Query()`, `@Mutation()`, `@Subscription()` decorators

4. **Schema Generation**
   - Builds GraphQL type definitions
   - Builds Query/Mutation/Subscription types
   - Applies `sortSchema: true` (alphabetical order)

5. **File Writing**
   - Writes to `apps/api/src/schema.gql`
   - Overwrites existing file (if any)

6. **Server Start**
   - Apollo Server starts with the generated schema
   - GraphQL Playground becomes available

---

## 🎨 Decorator Reference

### Entity Decorators

| Decorator | Purpose | GraphQL Schema Impact |
|-----------|---------|----------------------|
| `@ObjectType()` | Makes class a GraphQL type | ✅ Included in schema |
| `@ObjectType({ isAbstract: true })` | Abstract base type | ⚠️ Not directly in schema, but fields inherited |
| `@Field()` | Exposes field to GraphQL | ✅ Included in schema |
| `@HideField()` | Hides field from GraphQL | ❌ Not included in schema |
| `@Field({ nullable: true })` | Makes field optional | `field: Type` (nullable) |
| `@Field(() => [Type])` | Array field | `field: [Type!]!` |

### Resolver Decorators

| Decorator | Purpose | GraphQL Schema Impact |
|-----------|---------|----------------------|
| `@Resolver()` | Marks class as resolver | ✅ Scanned for queries/mutations |
| `@Query(() => Type)` | Defines query | ✅ Added to Query type |
| `@Mutation(() => Type)` | Defines mutation | ✅ Added to Mutation type |
| `@Subscription(() => Type)` | Defines subscription | ✅ Added to Subscription type |

---

## 📝 Complete Example

### Entity Definition

```typescript
// apps/api/src/app/tutor/entities/tutor.entity.ts
import { Entity, Column } from 'typeorm';
import { ObjectType, Field, HideField } from '@nestjs/graphql';
import { QBaseEntity } from '../../common/base-entities/base.entity';

@ObjectType()  // ← Makes it a GraphQL type
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  firstName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bio: string;

  @HideField()  // ← Hidden from GraphQL
  @Column()
  internalNotes: string;
}
```

### Resolver Definition

```typescript
// apps/api/src/app/tutor/resolvers/tutor.resolver.ts
import { Resolver, Query, Args } from '@nestjs/graphql';
import { Tutor } from '../entities/tutor.entity';

@Resolver(() => Tutor)
export class TutorResolver {
  @Query(() => [Tutor])
  async tutors(): Promise<Tutor[]> {
    // Implementation
  }

  @Query(() => Tutor, { nullable: true })
  async tutor(@Args('id') id: number): Promise<Tutor | null> {
    // Implementation
  }
}
```

### Generated Schema

```graphql
type Query {
  tutors: [Tutor!]!
  tutor(id: Int!): Tutor
}

type Tutor {
  id: Int!
  version: Int!
  createdDate: DateTime!
  updatedDate: DateTime!
  m_id: String
  email: String!
  firstName: String!
  bio: String
  # internalNotes is NOT included
}
```

---

## 🔄 Schema Updates

### When Schema Changes

The schema is **automatically regenerated** when:
- ✅ You start/restart the API
- ✅ You add/modify `@ObjectType()` classes
- ✅ You add/modify `@Resolver()` classes
- ✅ You add/modify `@Query()`, `@Mutation()`, `@Subscription()`
- ✅ You add/modify `@Field()` decorators

**No manual steps required!** Just restart the API.

### Development Workflow

```bash
# 1. Modify entity or resolver
# Edit: apps/api/src/app/tutor/entities/tutor.entity.ts
# Add: @Field() newField: string;

# 2. Restart API (schema auto-regenerates)
npm run serve:api

# 3. Check generated schema
# File: apps/api/src/schema.gql
# Or: http://localhost:3000/api/graphql (Playground)
```

---

## 🚨 Common Scenarios

### Scenario 1: Entity Not Appearing in Schema

**Problem:** Created an entity but it doesn't show in GraphQL schema.

**Causes:**
1. Missing `@ObjectType()` decorator
2. Entity not imported in any module
3. No resolver using the entity

**Solution:**
```typescript
// Add @ObjectType() decorator
@ObjectType()  // ← Add this
@Entity('tutor')
export class Tutor extends QBaseEntity {
  // ...
}
```

### Scenario 2: Field Not Appearing in Schema

**Problem:** Added a field to entity but it doesn't show in GraphQL.

**Causes:**
1. Missing `@Field()` decorator
2. Has `@HideField()` decorator
3. Field is in abstract base class without `@Field()`

**Solution:**
```typescript
@Field()  // ← Add this
@Column()
newField: string;
```

### Scenario 3: Schema File Not Generated

**Problem:** `schema.gql` file doesn't exist after starting API.

**Causes:**
1. Application failed to start
2. GraphQL module not imported
3. Path issue in `autoSchemaFile`

**Solution:**
```bash
# Check for errors
npm run serve:api

# Verify GraphQL module is imported
# Check: apps/api/src/app/app.module.ts
imports: [GraphqlModule]  // ← Should be here
```

### Scenario 4: Base Entity Fields Not Inherited

**Problem:** Extended `QBaseEntity` but fields don't appear.

**Solution:**
The base entity uses `@ObjectType({ isAbstract: true })`, so fields are inherited. Make sure:
1. Child entity has `@ObjectType()` (not abstract)
2. Base entity fields have `@Field()` decorator
3. Child entity properly extends base entity

---

## 📊 Schema File Structure

**Location:** `apps/api/src/schema.gql`

**Example Content:**
```graphql
# This file is auto-generated. Do not edit manually.

type Query {
  hello: String!
  health: HealthStatus!
  tutors: [Tutor!]!
  tutor(id: Int!): Tutor
}

type Mutation {
  createTutor(input: CreateTutorInput!): Tutor!
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

type HealthStatus {
  status: String!
  message: String!
}

input CreateTutorInput {
  email: String!
  firstName: String!
  lastName: String!
  bio: String
}
```

---

## ✅ Best Practices

### ✅ DO:

1. **Use `@ObjectType()` on entities** you want in GraphQL
2. **Use `@Field()` on properties** you want exposed
3. **Use `@HideField()`** for sensitive/internal fields
4. **Use `@ObjectType({ isAbstract: true })`** for base entities
5. **Review generated schema** after making changes
6. **Use descriptive type names** (e.g., `Tutor`, `Student`, not `T`, `S`)
7. **Add descriptions** to fields: `@Field({ description: 'Tutor email address' })`

### ❌ DON'T:

1. **Don't manually edit `schema.gql`** (it's auto-generated)
2. **Don't commit `schema.gql`** (it's in `.gitignore`)
3. **Don't use `@Field()` on database-only fields** (use `@HideField()`)
4. **Don't forget `@ObjectType()`** on entities you want in GraphQL
5. **Don't expose sensitive data** (passwords, tokens, etc.)

---

## 🔗 Related Documentation

- [GraphQL Module Configuration](../apps/api/src/app/graphql/graphql.module.ts)
- [Base Entity](../apps/api/src/app/common/base-entities/base.entity.ts)
- [NestJS GraphQL Documentation](https://docs.nestjs.com/graphql/quick-start)

---

## 🎯 Quick Reference

**Schema Generation:**
- ✅ Automatic on app start
- ✅ Generated from decorators
- ✅ Saved to `apps/api/src/schema.gql`
- ✅ Overwrites existing file

**To Include in Schema:**
- Add `@ObjectType()` to class
- Add `@Field()` to properties
- Add `@Query()`, `@Mutation()` to resolver methods

**To Exclude from Schema:**
- Use `@HideField()` decorator
- Don't add `@ObjectType()` to class
- Don't add `@Field()` to property

