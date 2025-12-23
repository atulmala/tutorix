/**
 * Example Entity - DELETE THIS FILE when you create your first real entity
 * 
 * This file demonstrates the structure of a TypeORM entity.
 * 
 * To use this as a template:
 * 1. Copy this file
 * 2. Rename the class and file
 * 3. Update the @Entity() decorator with your table name
 * 4. Add your columns
 * 5. Remove this comment block
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('example') // Table name in database
export class Example {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

