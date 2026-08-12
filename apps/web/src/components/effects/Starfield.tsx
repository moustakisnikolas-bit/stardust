"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Deterministic PRNG (mulberry32) instead of Math.random() - this component
 * renders on the server too (it's a Client Component, but Next.js still
 * SSRs it for the initial HTML), so star positions must be identical
 * between server and client or React throws a hydration mismatch.
 */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a single `box-shadow` string with many tiny dots - one paint operation, no per-star DOM nodes. */
function buildDustLayer(seed: number, count: number, size: number, opacityRange: [number, number]): string {
  const rand = mulberry32(seed);
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * 2000);
    const y = Math.floor(rand() * 2000);
    const opacity = (opacityRange[0] + rand() * (opacityRange[1] - opacityRange[0])).toFixed(2);
    shadows.push(`${x}px ${y}px rgba(244, 240, 255, ${opacity})`);
  }
  return shadows.join(", ");
}

interface TwinkleStar {
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
}

function buildTwinkleStars(seed: number, count: number): TwinkleStar[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    top: `${(rand() * 100).toFixed(2)}%`,
    left: `${(rand() * 100).toFixed(2)}%`,
    size: 1 + Math.round(rand() * 2),
    delay: `${(rand() * 6).toFixed(2)}s`,
    duration: `${(2.5 + rand() * 3).toFixed(2)}s`,
  }));
}

export function Starfield() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const shootingStarRef = useRef<HTMLDivElement>(null);

  const dustFar = useMemo(() => buildDustLayer(1, 140, 1, [0.15, 0.45]), []);
  const dustNear = useMemo(() => buildDustLayer(2, 70, 2, [0.35, 0.8]), []);
  const twinkleStars = useMemo(() => buildTwinkleStars(3, 22), []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    function fireShootingStar() {
      const el = shootingStarRef.current;
      if (!el) return;
      el.style.top = `${5 + Math.random() * 40}%`;
      el.style.left = `${Math.random() * 50}%`;
      el.classList.remove("stardust-shoot");
      // Force reflow so the animation restarts even if the class was already removed.
      void el.offsetWidth;
      el.classList.add("stardust-shoot");
    }

    const interval = setInterval(fireShootingStar, 7000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="stardust-field" aria-hidden="true">
      <div
        className={reducedMotion ? undefined : "stardust-drift-slow"}
        style={{
          position: "absolute",
          inset: 0,
          width: 2000,
          height: 2000,
          boxShadow: dustFar,
          borderRadius: "50%",
        }}
      />
      <div
        className={reducedMotion ? undefined : "stardust-drift-fast"}
        style={{
          position: "absolute",
          inset: 0,
          width: 2000,
          height: 2000,
          boxShadow: dustNear,
          borderRadius: "50%",
        }}
      />
      {!reducedMotion &&
        twinkleStars.map((star, i) => (
          <span
            key={i}
            className="stardust-twinkle"
            style={{
              position: "absolute",
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              background: "#f4f0ff",
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      <div ref={shootingStarRef} className="stardust-shooting-star" />
    </div>
  );
}
