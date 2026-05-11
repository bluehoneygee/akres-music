import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  async function credentialsLogin(formData: FormData) {
    "use server";

    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }

      throw error;
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="liquid-glass w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Masuk Akres Music</CardTitle>
          <p className="text-sm text-zinc-500">
            Gunakan akun yang sudah dibuat admin/staff di menu Users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginError searchParams={searchParams} />
          <form action={credentialsLogin} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-500">Email</span>
              <input
                className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                defaultValue="admin@akres.test"
                name="email"
                type="email"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-500">Password</span>
              <input
                className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                defaultValue="admin123"
                name="password"
                type="password"
              />
            </label>
            <Button className="w-full" type="submit">
              Masuk
            </Button>
          </form>
          <p className="text-center text-xs text-zinc-500">
            User dibuat dan diatur dari dashboard Users oleh admin/staff.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  if (!params.error) return null;

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      Email atau password tidak cocok.
    </div>
  );
}
