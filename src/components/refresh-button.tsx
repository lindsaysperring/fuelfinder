import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './ui/loading-spinner';

interface RefreshButtonProps {
  onRefresh: () => void;
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function RefreshButton({
  onRefresh,
  lastUpdated,
  isLoading
}: RefreshButtonProps) {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'over a day ago';
  };

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={onRefresh}
        disabled={isLoading}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <RefreshCw className='mr-1 h-4 w-4' />
            Refresh Prices
          </>
        )}
      </Button>
      {lastUpdated && (
        <span className='text-muted-foreground text-sm'>
          Updated {getTimeAgo(lastUpdated)}
        </span>
      )}
    </div>
  );
}
