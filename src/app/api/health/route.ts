import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker and monitoring
 * GET /api/health
 */
export async function GET() {
  try {
    // Basic health check - just verify the app is responding
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'fuelfinder',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
