'use client';

import { useState, useEffect } from 'react';

interface UseGoogleMapsResult {
  isLoaded: boolean;
  loadError: string | null;
}

let scriptPromise: Promise<void> | null = null;

function getInitialLoadError(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.google?.maps) return null;
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return 'Google Maps API key is not configured';
  }
  return null;
}

function checkGoogleMapsLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.google?.maps?.places) return true;
  return !!document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  );
}

function getNonce(): string | undefined {
  const script = document.querySelector('script[nonce]');
  return script?.getAttribute('nonce') ?? undefined;
}

function waitForPlacesLibrary(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    const check = () => {
      if (window.google?.maps?.places) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  if (window.google?.maps?.places) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  const existing = document.querySelector<HTMLScriptElement>(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  );

  if (existing) {
    scriptPromise = waitForPlacesLibrary();
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async`;
    script.async = true;
    script.defer = true;

    const nonce = getNonce();
    if (nonce) script.nonce = nonce;

    script.addEventListener('load', () => {
      waitForPlacesLibrary().then(resolve);
    });
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function useGoogleMaps(): UseGoogleMapsResult {
  const [isLoaded, setIsLoaded] = useState(checkGoogleMapsLoaded);
  const [loadError, setLoadError] = useState<string | null>(getInitialLoadError);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoaded || loadError) return;

    loadScript().then(
      () => setIsLoaded(true),
      () => setLoadError('Failed to load Google Maps')
    );
  }, [isLoaded, loadError]);

  return { isLoaded, loadError };
}
