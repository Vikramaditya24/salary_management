import { randomBytes, scryptSync } from 'node:crypto';
const password = process.argv[2];
if (!password || password.length < 12)
  throw new Error('Pass a password of at least 12 characters.');
const salt = randomBytes(16);
console.log(`scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 32).toString('hex')}`);
