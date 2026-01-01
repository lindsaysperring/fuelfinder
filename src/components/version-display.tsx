'use client';

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  nodeVersion: string;
  uptime: number;
  environment: string;
  timestamp: string;
}

export function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fetch version info on mount
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => setVersionInfo(data))
      .catch((err) => console.error('Failed to fetch version:', err));

    // Listen for keyboard shortcut (Ctrl/Cmd + I)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    globalThis.addEventListener('keydown', handleKeyPress);
    return () => globalThis.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible || !versionInfo) {
    return null;
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">🚗 FuelFinder</h3>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {versionInfo.version}
            </span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Node: {versionInfo.nodeVersion}</div>
            <div>Environment: {versionInfo.environment}</div>
            <div>Uptime: {formatUptime(versionInfo.uptime)}</div>
            <div className="text-[10px]">
              {new Date(versionInfo.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
        Press <kbd className="rounded border border-border bg-muted px-1">Ctrl+I</kbd> to
        toggle
      </div>
    </div>
  );
}
