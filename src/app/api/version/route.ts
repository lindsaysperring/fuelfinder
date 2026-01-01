import { NextResponse } from 'next/server';

/**
 * Version information endpoint
 * GET /api/version
 */
export async function GET() {
  const version = process.env.VERSION || process.env.NEXT_PUBLIC_VERSION || 'dev';
  const nodeVersion = process.version;
  const uptime = process.uptime();

  return NextResponse.json({
    version,
    nodeVersion,
    uptime: Math.floor(uptime),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
