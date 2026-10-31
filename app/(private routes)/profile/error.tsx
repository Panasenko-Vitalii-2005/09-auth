"use client";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <main>
      <p role="alert">Could not load your profile. Please try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
