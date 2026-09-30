"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Registration failed");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Account created, but sign-in failed. Try the login page.");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Registration failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-label="Create account">
      <label className="block text-sm">
        Name <span className="text-zinc-500">(optional)</span>
        <input
          type="text"
          autoComplete="name"
          data-testid="register-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          data-testid="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          data-testid="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
      </label>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        data-testid="register-submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-400 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
