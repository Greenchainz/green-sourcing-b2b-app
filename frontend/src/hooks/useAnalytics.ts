import { useEffect } from 'react';
import { track, identify, reset, captureError } from '../lib/analytics';

export const useAnalytics = () => {
  const useTrack = (event: string, properties?: Record<string, any>) => {
    track(event, properties);
  };

  const useIdentify = (user: { id: string; email?: string; role?: string } | null) => {
    useEffect(() => {
      if (user?.id) {
        identify(user);
      } else if (user === null) {
        // Optionally reset if explicitly passed null, but typically handled by logout.
        // reset();
      }
    }, [user?.id]); // Only re-run if ID changes
  };

  const useCaptureError = (error: unknown, context?: Record<string, any>) => {
    captureError(error, context);
  }

  return {
    track: useTrack,
    identify: (user: { id: string; email?: string; role?: string }) => identify(user),
    reset: () => reset(),
    captureError: useCaptureError,
  };
};

export default useAnalytics;
