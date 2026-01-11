"use client";

import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";
import { MapPin, Navigation, Save, CheckCircle } from "lucide-react";

export default function SupplierLocationSetup() {
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [serviceRadius, setServiceRadius] = useState(100);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleLocationChange = (
    value: string,
    coords?: { lat: number; lng: number }
  ) => {
    setLocation(value);
    if (coords) {
      setCoordinates(coords);
    }
  };

  const handleSave = async () => {
    if (!location || !coordinates) {
      setError("Please select a valid location");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/suppliers/profile/location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: location,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          service_radius: serviceRadius,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to save location");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Location save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const radiusOptions = [
    { value: 25, label: "25 miles - Local only" },
    { value: 50, label: "50 miles - Regional" },
    { value: 100, label: "100 miles - Wide area" },
    { value: 250, label: "250 miles - Multi-state" },
    { value: 500, label: "500 miles - National" },
    { value: 9999, label: "Unlimited - Ship anywhere" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Set Your Service Location
            </h2>
            <p className="text-gray-600">
              Architects will find you when searching for suppliers in your area
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Location Saved
              </p>
              <p className="text-sm text-green-600 mt-1">
                You'll now appear in searches within {serviceRadius} miles of
                your location
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Location Input */}
          <LocationAutocomplete
            value={location}
            onChange={handleLocationChange}
            label="Business Address"
            placeholder="Enter your business address or city"
            required
          />

          {/* Service Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Service Radius
            </label>
            <div className="space-y-2">
              {radiusOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${
                    serviceRadius === option.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="radius"
                    value={option.value}
                    checked={serviceRadius === option.value}
                    onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                    className="w-4 h-4 text-green-600"
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        serviceRadius === option.value
                          ? "text-green-900"
                          : "text-gray-900"
                      }`}
                    >
                      {option.label}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Visual Indicator */}
          {coordinates && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Location Confirmed
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Coordinates: {coordinates.lat.toFixed(4)},{" "}
                    {coordinates.lng.toFixed(4)}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    You'll appear in searches within{" "}
                    <strong>{serviceRadius} miles</strong> of this location
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading || !coordinates}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Location Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
