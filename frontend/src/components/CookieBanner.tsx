import React, { useState, useEffect } from 'react';
import { initAnalytics } from '../lib/analytics';

type ConsentCategories = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = 'cookie_consent_preferences';

const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<ConsentCategories>({
    essential: true, // Always true and disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const savedPreferences = localStorage.getItem(STORAGE_KEY);
    if (!savedPreferences) {
      setShowBanner(true);
    } else {
      const parsed = JSON.parse(savedPreferences);
      setPreferences(parsed);
      if (parsed.analytics) {
        initAnalytics();
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    savePreferences(allAccepted);
  };

  const handleRejectNonEssential = () => {
    const rejected = { essential: true, analytics: false, marketing: false };
    savePreferences(rejected);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs: ConsentCategories) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);

    // Set a cookie as well for backend if needed
    document.cookie = `cookie_consent=${JSON.stringify(prefs)}; path=/; max-age=31536000`; // 1 year

    if (prefs.analytics) {
      initAnalytics();
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg transform transition-transform duration-300 ease-in-out">
      <div className="max-w-7xl mx-auto">
        {!showCustomize ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">We value your privacy</p>
              <p>
                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                By clicking "Accept All", you consent to our use of cookies.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
               <button
                onClick={() => setShowCustomize(true)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Customize
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Customize Cookie Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Essential</p>
                  <p className="text-sm text-gray-500">Required for the website to function properly.</p>
                </div>
                <input type="checkbox" checked disabled className="h-4 w-4 text-green-600 rounded border-gray-300" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Analytics</p>
                  <p className="text-sm text-gray-500">Help us understand how you use the website.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Marketing</p>
                  <p className="text-sm text-gray-500">Used to deliver relevant advertisements.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setShowCustomize(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
