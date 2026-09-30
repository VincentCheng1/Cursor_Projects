import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Create your CardVault account</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Track your collection and know what it&apos;s worth from completed sales.
      </p>
      <RegisterForm />
    </main>
  );
}
