"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader } from "lucide-react";

interface LocationSuggestion {
  placeId: string;
  description: string;
  city?: string;
  state?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Enter city or address",
  label = "Location",
  required = false,
  error,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions from Azure Maps (via backend proxy)
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/v1/geocode/autocomplete?query=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Location autocomplete error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce input
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (value) {
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [value]);

  const handleSelect = async (suggestion: LocationSuggestion) => {
    // Set the display value
    onChange(suggestion.description);
    setShowSuggestions(false);

    // Geocode to get exact coordinates
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/v1/geocode/address?address=${encodeURIComponent(suggestion.description)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (data.success && data.data.coordinates) {
        onChange(suggestion.description, data.data.coordinates);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() =>
            value && suggestions.length > 0 && setShowSuggestions(true)
          }
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            error ? "border-red-300" : "border-gray-300"
          }`}
        />

        {loading && (
          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0 transition"
            >
              <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {suggestion.description}
                </p>
                {(suggestion.city || suggestion.state) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {[suggestion.city, suggestion.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
