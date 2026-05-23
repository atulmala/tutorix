#!/usr/bin/env ts-node
/**
 * Create an ADMIN user for the Tutorix admin console.
 *
 * Usage:
 *   npm run create:admin
 */

import * as readline from 'readline';
import * as bcrypt from 'bcrypt';
import dataSource from '../../../data-source';
import { User } from '../../modules/auth/entities/user.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { Gender } from '../../modules/auth/enums/gender.enum';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

function createPrompter() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function askPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rl.question(`${prompt}`, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener('data', onData);
    };

    const onData = (chunk: Buffer | string) => {
      const char = chunk.toString();

      if (char === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        reject(new Error('Cancelled'));
        return;
      }

      if (char === '\r' || char === '\n' || char === '\u0004') {
        cleanup();
        process.stdout.write('\n');
        resolve(password);
        return;
      }

      if (char === '\u007f' || char === '\b') {
        password = password.slice(0, -1);
        return;
      }

      password += char;
      process.stdout.write('*');
    };

    process.stdin.on('data', onData);
  });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function promptEmail(rl: readline.Interface): Promise<string> {
  while (true) {
    const email = (await ask(rl, 'Admin email (login username): ')).toLowerCase();
    if (!email) {
      console.log('Email is required.');
      continue;
    }
    if (!isValidEmail(email)) {
      console.log('Enter a valid email address.');
      continue;
    }
    return email;
  }
}

async function promptPassword(): Promise<string> {
  while (true) {
    const password = await askPassword('Password (min 8 characters): ');
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.log(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      continue;
    }
    const confirm = await askPassword('Confirm password: ');
    if (password !== confirm) {
      console.log('Passwords do not match. Try again.');
      continue;
    }
    return password;
  }
}

async function main(): Promise<void> {
  console.log('\nTutorix — Create admin user\n');

  const rl = createPrompter();

  let email: string;
  let password: string;

  try {
    email = await promptEmail(rl);
    rl.close();
    password = await promptPassword();
  } catch (err) {
    rl.close();
    throw err;
  }

  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email } });

    if (existing) {
      if (existing.role === UserRole.ADMIN && !existing.deleted) {
        console.error(`\nAn admin user with email "${email}" already exists (id=${existing.id}).`);
        process.exitCode = 1;
        return;
      }
      console.error(
        `\nA user with email "${email}" already exists with role ${existing.role}.`,
      );
      process.exitCode = 1;
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = repo.create({
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      gender: Gender.OTHER,
      isSignupComplete: true,
      isEmailVerified: true,
      active: true,
      deleted: false,
    });

    const saved = await repo.save(user);

    console.log('\nAdmin user created successfully.');
    console.log(`  id:    ${saved.id}`);
    console.log(`  email: ${saved.email}`);
    console.log('\nSign in at the admin console with this email and password.\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('\nFailed to create admin user:', err instanceof Error ? err.message : err);
  process.exit(1);
});
