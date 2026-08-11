"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NatalChart } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, ApiError } from "@/lib/apiClient";

const BODY_SYMBOLS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  Ascendant: "ASC",
  MC: "MC",
};

export default function ProfilePage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { user, accessToken, logout } = useAuth();
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ natalChart: { placements: NatalChart["placements"]; houses: NatalChart["houses"]; providerId: string; computedAt: string } }>(
      "/api/onboarding/chart",
      { accessToken },
    )
      .then(({ natalChart }) =>
        setChart({
          providerId: natalChart.providerId,
          computedAt: natalChart.computedAt,
          placements: natalChart.placements,
          houses: natalChart.houses,
        }),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load chart"));
  }, [accessToken]);

  if (loading) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stardust-200">Your natal chart</h1>
            <p className="text-sm text-stardust-400">{user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/swipe" className="text-sm text-stardust-400 underline hover:text-stardust-200">
              Discover
            </Link>
            <Link href="/matches" className="text-sm text-stardust-400 underline hover:text-stardust-200">
              Matches
            </Link>
            <button onClick={logout} className="text-sm text-stardust-400 underline hover:text-stardust-200">
              Log out
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!chart && !error && <p className="text-stardust-400">Loading your chart...</p>}

        {chart && (
          <div className="overflow-hidden rounded-2xl border border-stardust-600/40 bg-stardust-900/60 shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stardust-600/40 text-stardust-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Body</th>
                  <th className="px-4 py-3 font-medium">Sign</th>
                  <th className="px-4 py-3 font-medium">Degree</th>
                  <th className="px-4 py-3 font-medium">House</th>
                </tr>
              </thead>
              <tbody>
                {chart.placements.map((p) => (
                  <tr key={p.body} className="border-b border-stardust-600/20 last:border-0">
                    <td className="px-4 py-3 text-stardust-100">
                      <span className="mr-2 text-stardust-400">{BODY_SYMBOLS[p.body] ?? ""}</span>
                      {p.body}
                    </td>
                    <td className="px-4 py-3 text-stardust-100">
                      {p.sign}
                      {p.retrograde && <span className="ml-1 text-xs text-stardust-400">R</span>}
                    </td>
                    <td className="px-4 py-3 text-stardust-400">{p.degreeInSign.toFixed(1)}°</td>
                    <td className="px-4 py-3 text-stardust-400">{p.house ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-stardust-600/40 px-4 py-3 text-xs text-stardust-400">
              Computed via {chart.providerId} on {new Date(chart.computedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
