"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  GENDER_OPTIONS,
  GENDER_PREFERENCE_OPTIONS,
  type MyProfile,
  type PhotoDto,
} from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, apiUpload, ApiError } from "@/lib/apiClient";
import { NotificationToggle } from "@/components/settings/NotificationToggle";

const GENDER_LABELS: Record<string, string> = { woman: "Woman", man: "Man", nonbinary: "Non-binary", any: "Anyone" };

export default function EditProfilePage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { accessToken } = useAuth();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<string>("");
  const [genderPreference, setGenderPreference] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ profile: MyProfile }>("/api/users/me", { accessToken })
      .then(({ profile }) => {
        setProfile(profile);
        setDisplayName(profile.displayName ?? "");
        setBio(profile.bio ?? "");
        setGender(profile.gender ?? "");
        setGenderPreference(profile.genderPreference ?? "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile"));
  }, [accessToken]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const { profile: updated } = await apiRequest<{ profile: MyProfile }>("/api/users/me", {
        method: "PUT",
        accessToken,
        body: {
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          gender: gender || null,
          genderPreference: genderPreference || null,
        },
      });
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const { photo } = await apiUpload<{ photo: PhotoDto }>("/api/users/me/photos", form, { accessToken });
      setProfile({ ...profile, photos: [...profile.photos, photo] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!profile) return;
    setError(null);
    try {
      await apiRequest(`/api/users/me/photos/${photoId}`, { method: "DELETE", accessToken });
      setProfile({ ...profile, photos: profile.photos.filter((p) => p.id !== photoId) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete photo");
    }
  }

  if (loading || !profile) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stardust-200">Edit profile</h1>
          <Link href="/profile" className="text-sm text-stardust-400 underline hover:text-stardust-200">
            Back
          </Link>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-stardust-200">Photos</h2>
          <div className="grid grid-cols-3 gap-3">
            {profile.photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stardust-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute right-1 top-1 rounded-full bg-stardust-950/80 px-2 py-0.5 text-xs text-stardust-100 opacity-0 transition group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
            {profile.photos.length < 6 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-stardust-600/50 text-stardust-400 transition hover:border-stardust-400 disabled:opacity-50"
              >
                {uploading ? "..." : "+ Add"}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoSelected}
          />
        </section>

        <NotificationToggle accessToken={accessToken} />

        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-6">
          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="gender">
              I am
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            >
              <option value="">Prefer not to say</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-stardust-200" htmlFor="genderPreference">
              Show me
            </label>
            <select
              id="genderPreference"
              value={genderPreference}
              onChange={(e) => setGenderPreference(e.target.value)}
              className="w-full rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
            >
              <option value="">No preference</option>
              {GENDER_PREFERENCE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && <p className="text-sm text-stardust-200">Saved.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-stardust-400 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
