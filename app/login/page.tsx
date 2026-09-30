import Link from "next/link";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Sign in to track your collection and refresh market values from completed sales.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-zinc-400">
        New to CardVault?{" "}
        <Link href="/register" className="text-emerald-400 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
