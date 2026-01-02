import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPage } from '../lib/analytics';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackPage(location.pathname + location.search);
  }, [location]);
};

export default usePageTracking;
