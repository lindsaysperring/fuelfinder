import { NextRequest, NextResponse } from 'next/server';
import { cleanupCacheAction } from '@/actions/cache-actions';

// Vercel Cron Job - runs daily at midnight UTC
export async function GET(request: NextRequest) {
  try {
    // Check for authentication if MAINTENANCE_KEY is set
    const maintenanceKey = process.env.MAINTENANCE_KEY;
    if (maintenanceKey) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${maintenanceKey}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const result = await cleanupCacheAction();
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed successfully',
      deletedCount: result.data.deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during scheduled cache cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
