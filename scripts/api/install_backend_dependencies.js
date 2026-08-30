#!/usr/bin/env node
/**
 * KARTSEEK — Full Backend Dependency Installer
 * ────────────────────────────────────────────────────────────────────────
 * Installs all required npm packages for the NestJS backend.
 *
 * Location: scripts/api/install_backend_dependencies.js
 * Run from monorepo root:
 *   node scripts/api/install_backend_dependencies.js
 * ────────────────────────────────────────────────────────────────────────
 */
const { execSync } = require('child_process');
const path = require('path');

const API_DIR = path.resolve(__dirname, '..', '..', 'apps', 'api');

const PACKAGES = [
  // Redis
  'ioredis',
  '@types/ioredis',
  // MongoDB / Mongoose
  '@nestjs/mongoose',
  'mongoose',
  // GraphQL
  '@apollo/server',
  '@nestjs/apollo',
  '@nestjs/graphql',
  'graphql',
  // Kafka
  'kafkajs',
  // gRPC
  '@grpc/grpc-js',
  '@grpc/proto-loader',
  // Auth / Security
  'bcrypt',
  '@types/bcrypt',
  'passport',
  'passport-jwt',
  '@types/passport-jwt',
  // Utilities
  'uuid',
  '@types/uuid',
  'multer',
  '@types/multer',
  // NestJS extras
  '@nestjs/config',
  '@nestjs/jwt',
  '@nestjs/passport',
  '@nestjs/microservices',
  '@nestjs/throttler',
  '@nestjs/schedule',
  '@nestjs/websockets',
  '@nestjs/platform-socket.io',
  '@nestjs/typeorm',
  // Infra
  'socket.io',
  'typeorm',
  'pg',
  'class-validator',
  'class-transformer',
  'reflect-metadata',
  'rxjs',
];

console.log('📦 Installing KARTSEEK backend dependencies...\n');
const cmd = `npm install ${PACKAGES.join(' ')} --save`;
console.log('Running:', cmd.slice(0, 80) + '...\n');
try {
  execSync(cmd, { stdio: 'inherit', cwd: API_DIR });
  console.log('\n✅ All dependencies installed successfully.');
} catch (e) {
  console.error('\n❌ Install failed:', e.message);
  process.exit(1);
}
