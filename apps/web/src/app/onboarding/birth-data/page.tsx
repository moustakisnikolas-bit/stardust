"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GeocodeResult } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, ApiError } from "@/lib/apiClient";

export default function BirthDataPage() {
  const { loading } = useRequireAuth();
  const { accessToken, refreshUser } = useAuth();
  const router = useRouter();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);

  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<GeocodeResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    if (selectedLocation && locationQuery === selectedLocation.displayName) return;
    if (locationQuery.trim().length < 3) {
      setLocationResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await apiRequest<{ results: GeocodeResult[] }>(
          `/api/onboarding/geocode?q=${encodeURIComponent(locationQuery)}`,
          { accessToken },
        );
        setLocationResults(results);
      } catch {
        setLocationResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationQuery, accessToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedLocation) {
      setError("Pick a birth location from the suggestions list");
      return;
    }
    if (!timeUnknown && !birthTime) {
      setError("Enter a birth time, or check 'I don't know my birth time'");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/onboarding/birth-data", {
        method: "POST",
        accessToken,
        body: {
          birthDate,
          birthTime: timeUnknown ? null : birthTime,
          timeUnknown,
          birthLocationRaw: selectedLocation.displayName,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
      });
      await refreshUser();
      router.push("/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong computing your chart");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-8 shadow-xl">
        <h1 className="mb-1 text-2xl font-semibold text-stardust-200">Your birth chart</h1>
        <p className="mb-6 text-sm text-stardust-400">
          We need your exact birth date, time, and location to compute an accurate natal chart - the
          same birth moment looks different from different places on Earth.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="birthDate">
              Birth date
            </label>
            <input
              id="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="birthTime">
              Birth time
            </label>
            <input
              id="birthTime"
              type="time"
              disabled={timeUnknown}
              required={!timeUnknown}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400 disabled:opacity-40"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-stardust-400">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
              />
              I don&apos;t know my birth time
            </label>
          </div>

          <div className="relative">
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="location">
              Birth location
            </label>
            <input
              id="location"
              type="text"
              required
              placeholder="City, Country"
              value={locationQuery}
              onChange={(e) => {
                setLocationQuery(e.target.value);
                setSelectedLocation(null);
              }}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            />
            {searching && <p className="mt-1 text-xs text-stardust-400">Searching...</p>}
            {locationResults.length > 0 && !selectedLocation && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stardust-600/50 bg-stardust-950 shadow-lg">
                {locationResults.map((result) => (
                  <li key={result.placeId ?? result.displayName}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(result);
                        setLocationQuery(result.displayName);
                        setLocationResults([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-stardust-200 hover:bg-stardust-800"
                    >
                      {result.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-stardust-400 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
          >
            {submitting ? "Computing your chart..." : "Compute my chart"}
          </button>
        </form>
      </div>
    </main>
  );
}
