import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const entrypoint = readFileSync(resolve(root, 'docker-entrypoint.sh'), 'utf8');
const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

describe('docker entrypoint regression guard', () => {
  it('does not use pnpm dlx (unpinned CLI drift)', () => {
    expect(entrypoint).not.toContain('dlx');
  });

  it('does not run db push with data loss', () => {
    expect(entrypoint).not.toContain('--accept-data-loss');
  });

  it('does not swallow stderr', () => {
    expect(entrypoint).not.toContain('2>/dev/null');
  });

  it('runs prisma migrate deploy', () => {
    expect(entrypoint).toContain('prisma migrate deploy');
  });

  it('requires DATABASE_URL instead of defaulting to a throwaway path', () => {
    expect(entrypoint).toContain('${DATABASE_URL:?');
    expect(entrypoint).not.toContain('file:./prisma/dev.db');
  });

  it('exits non-zero on migration failure', () => {
    expect(entrypoint).toContain('exit 1');
  });
});

describe('Dockerfile regression guard', () => {
  it('installs the Prisma CLI into /opt/prisma-cli', () => {
    expect(dockerfile).toContain('/opt/prisma-cli');
  });

  it('symlinks prisma into /app/node_modules so prisma.config.ts resolves', () => {
    expect(dockerfile).toMatch(/ln -s \/opt\/prisma-cli\/node_modules\/prisma \/app\/node_modules\/prisma/);
    expect(dockerfile).toMatch(/ln -s \/opt\/prisma-cli\/node_modules\/dotenv \/app\/node_modules\/dotenv/);
  });

  it('does not use pnpm dlx', () => {
    expect(dockerfile).not.toContain('dlx');
  });

  it('verifies the CLI works at build time', () => {
    expect(dockerfile).toContain('prisma --version');
  });
});

describe('package.json regression guard', () => {
  it('pins prisma and @prisma packages to exact versions', () => {
    const exact = /^\d+\.\d+\.\d+$/;
    for (const dep of [
      'prisma',
      '@prisma/client',
      '@prisma/adapter-better-sqlite3',
      '@prisma/driver-adapter-utils',
    ]) {
      expect(pkg.dependencies[dep]).toMatch(exact);
    }
  });
});
