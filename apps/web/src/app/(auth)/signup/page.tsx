"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password);
      router.push("/onboarding/birth-data");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-8 shadow-xl">
        <h1 className="mb-1 text-2xl font-semibold text-stardust-200">Stardust</h1>
        <p className="mb-6 text-sm text-stardust-400">Create your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-stardust-400 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-stardust-400">
          <div className="h-px flex-1 bg-stardust-600/40" />
          or
          <div className="h-px flex-1 bg-stardust-600/40" />
        </div>

        <OAuthButtons />

        <p className="mt-6 text-center text-sm text-stardust-400">
          Already have an account?{" "}
          <Link href="/login" className="text-stardust-200 underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
