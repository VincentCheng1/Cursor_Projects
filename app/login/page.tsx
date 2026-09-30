import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Use credentials created in your database (bcrypt password hash on the user row).
      </p>
      <LoginForm />
    </main>
  );
}
