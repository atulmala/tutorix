#!/usr/bin/env node

/**
 * Generate JWT Secrets Script
 * 
 * Generates secure random JWT secret keys (access and refresh) suitable for production use.
 * 
 * Usage:
 *   node generate-jwt-secret.js
 */

const crypto = require('crypto');

/**
 * Generate a secure random JWT secret
 * @param {number} length - Length of the secret in bytes (default: 64)
 * @returns {string} Base64 encoded secret
 */
function generateJwtSecret(length = 64) {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  // Convert to base64 for easy copying
  return randomBytes.toString('base64');
}

// Generate both secrets
const accessSecret = generateJwtSecret(64);
const refreshSecret = generateJwtSecret(64);

console.log('\n🔐 Generated JWT Secrets:');
console.log('='.repeat(80));
console.log('\n📝 Access Token Secret:');
console.log(accessSecret);
console.log('\n📝 Refresh Token Secret:');
console.log(refreshSecret);
console.log('='.repeat(80));
console.log('\n📝 Add these to your .env file:');
console.log(`JWT_SECRET=${accessSecret}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecret}\n`);

