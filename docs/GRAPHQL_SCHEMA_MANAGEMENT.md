# GraphQL Schema Management Guide

This guide explains how to manage and clean up the auto-generated GraphQL schema.

## 📋 Important: Schema is Auto-Generated

**⚠️ Never manually edit `schema.gql`!**

The schema file (`apps/api/src/schema.gql`) is automatically generated from your TypeScript code. Any manual changes will be overwritten when you restart the application.

---

## 🗑️ How to Remove Types/Inputs from Schema

To remove a type or input from the GraphQL schema, you need to remove the source code that generates it.

### 1. **Remove Object Types**

**Problem:** A type appears in the schema that you don't want.

**Solution:** Remove or comment out the `@ObjectType()` decorator and related code.

**Example - Remove a type:**
```typescript
// ❌ This generates a GraphQL type
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  // ...
}

// ✅ To remove from schema, remove @ObjectType() decorator
@Entity('tutor')  // Still a database entity, but not in GraphQL
export class Tutor extends QBaseEntity {
  // ...
}
```

**Or delete the entire entity file if it's not needed:**
```bash
# Delete the file
rm apps/api/src/app/modules/tutor/entities/tutor.entity.ts

# Remove from module
# Edit tutor.module.ts and remove Tutor from TypeOrmModule.forFeature([Tutor])
```

---

### 2. **Remove Input Types**

**Problem:** An input type appears in the schema that you don't want.

**Solution:** Delete the DTO file or remove the `@InputType()` decorator.

**Example:**
```typescript
// ❌ This generates a GraphQL input type
@InputType()
export class CreateTutorInput {
  // ...
}

// ✅ To remove from schema, delete the file or remove @InputType()
// Just a regular class, not in GraphQL
export class CreateTutorInput {
  // ...
}
```

**Or delete the file:**
```bash
rm apps/api/src/app/modules/tutor/dto/create-tutor.input.dto.ts
```

**Important:** Also remove any imports/references to this input in resolvers or services.

---

### 3. **Remove Queries/Mutations**

**Problem:** A query or mutation appears in the schema that you don't want.

**Solution:** Remove the `@Query()` or `@Mutation()` decorator and method.

**Example:**
```typescript
@Resolver(() => Tutor)
export class TutorResolver {
  // ❌ This generates a GraphQL query
  @Query(() => [Tutor])
  async findAll(): Promise<Tutor[]> {
    return this.tutorService.findAll();
  }

  // ✅ To remove from schema, delete the method or remove @Query()
  // Just a regular method, not in GraphQL
  async findAll(): Promise<Tutor[]> {
    return this.tutorService.findAll();
  }
}
```

---

### 4. **Remove Enums**

**Problem:** An enum appears in the schema that you don't want.

**Solution:** Remove the `registerEnumType()` call or delete the enum file.

**Example:**
```typescript
export enum TutorStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
}

// ❌ This registers the enum with GraphQL
registerEnumType(TutorStatus, {
  name: 'TutorStatus',
  description: 'Status of a tutor',
});

// ✅ To remove from schema, delete the registerEnumType() call
// Enum still exists in TypeScript, but not in GraphQL
```

**Or delete the enum file:**
```bash
rm apps/api/src/app/modules/tutor/enums/tutor-status.enum.ts
```

---

### 5. **Remove Fields from Types**

**Problem:** A specific field appears in a type that you don't want.

**Solution:** Remove the `@Field()` decorator or use `@HideField()`.

**Example:**
```typescript
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  // ❌ This field appears in GraphQL schema
  @Field()
  @Column()
  email: string;

  // ✅ Option 1: Remove @Field() decorator
  // Field exists in database but not in GraphQL
  @Column()
  email: string;

  // ✅ Option 2: Use @HideField() (explicitly hides from GraphQL)
  @HideField()
  @Column()
  internalNote: string;
}
```

---

## 🔄 Regenerating the Schema

After making changes, restart the application to regenerate the schema:

```bash
npm run serve:api
```

The schema will be automatically regenerated based on your current code.

---

## 🔍 Finding What Generates a Type

If you see a type in the schema and want to find where it's defined:

### Method 1: Search for the type name
```bash
# Search for the type name in your codebase
grep -r "class TutorStatus" apps/api/src/
grep -r "@ObjectType()" apps/api/src/app/modules/
```

### Method 2: Check the schema file
The schema file shows the structure. Look for:
- `type TutorStatus` → Find `@ObjectType()` class named `TutorStatus`
- `input CreateTutorInput` → Find `@InputType()` class named `CreateTutorInput`
- `enum TutorStatus` → Find `registerEnumType(TutorStatus, ...)`

### Method 3: Use GraphQL Playground
1. Open `http://localhost:3000/api/graphql`
2. Check the "Schema" tab
3. Find the type and see its definition

---

## 📝 Common Scenarios

### Scenario 1: Remove a Test/Example Type

**Problem:** You created a test type and want to remove it.

**Solution:**
```bash
# 1. Find and delete the file
find apps/api/src -name "*test*.entity.ts" -o -name "*example*.entity.ts"

# 2. Remove from module imports
# Edit the module file and remove the entity from TypeOrmModule.forFeature([...])

# 3. Remove resolver if exists
# Delete or comment out the resolver file

# 4. Restart API
npm run serve:api
```

### Scenario 2: Hide Sensitive Fields

**Problem:** A field contains sensitive data and shouldn't be in GraphQL.

**Solution:**
```typescript
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field()
  email: string;

  // ✅ Hide sensitive field
  @HideField()
  @Column()
  passwordHash: string;  // Not in GraphQL schema
}
```

### Scenario 3: Temporarily Disable a Query

**Problem:** You want to temporarily disable a query without deleting code.

**Solution:**
```typescript
@Resolver(() => Tutor)
export class TutorResolver {
  // ✅ Comment out the decorator
  // @Query(() => [Tutor])
  async findAll(): Promise<Tutor[]> {
    return this.tutorService.findAll();
  }
}
```

### Scenario 4: Remove Unused Input Type

**Problem:** An input type is defined but never used.

**Solution:**
```bash
# 1. Check if it's used anywhere
grep -r "CreateTutorInput" apps/api/src/

# 2. If not used, delete the file
rm apps/api/src/app/modules/tutor/dto/create-tutor.input.dto.ts

# 3. Restart API
npm run serve:api
```

---

## ✅ Best Practices

### ✅ DO:

1. **Remove source code** to remove from schema
2. **Use `@HideField()`** for fields that should exist in DB but not GraphQL
3. **Delete unused files** (entities, DTOs, enums) to clean up schema
4. **Restart API** after changes to regenerate schema
5. **Check schema file** to verify changes

### ❌ DON'T:

1. **Don't manually edit `schema.gql`** - it will be overwritten
2. **Don't delete schema file** - it will be regenerated
3. **Don't ignore schema changes** - fix the source code instead
4. **Don't commit schema file** - it's in `.gitignore` for a reason

---

## 🔍 Verification Steps

After removing code, verify the schema:

1. **Restart the API:**
   ```bash
   npm run serve:api
   ```

2. **Check the schema file:**
   ```bash
   cat apps/api/src/schema.gql | grep -i "tutorstatus"
   # Should return nothing if removed
   ```

3. **Use GraphQL Playground:**
   - Open `http://localhost:3000/api/graphql`
   - Check the "Schema" tab
   - Verify the type/input/enum is gone

4. **Test queries:**
   ```graphql
   # This should fail if type was removed
   query {
     tutorStatus {
       # ...
     }
   }
   ```

---

## 📚 Summary

**To remove from GraphQL schema:**

| What to Remove | How to Remove |
|----------------|---------------|
| **Object Type** | Remove `@ObjectType()` decorator or delete entity file |
| **Input Type** | Remove `@InputType()` decorator or delete DTO file |
| **Query/Mutation** | Remove `@Query()`/`@Mutation()` decorator or delete method |
| **Enum** | Remove `registerEnumType()` call or delete enum file |
| **Field** | Remove `@Field()` decorator or use `@HideField()` |

**Remember:**
- ✅ Edit source code, not the schema file
- ✅ Restart API to regenerate schema
- ✅ Verify changes in GraphQL Playground

---

## 🔗 Related Documentation

- [GraphQL Schema Generation](./GRAPHQL_SCHEMA_GENERATION.md) - How schema is generated
- [GraphQL Module Structure](./GRAPHQL_MODULE_STRUCTURE.md) - Module organization

