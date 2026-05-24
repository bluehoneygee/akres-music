import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { LoginSubmitButton } from "@/components/login-submit-button";
import { PasswordInput } from "@/components/password-input";
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
    <main className="relative min-h-screen overflow-hidden bg-slate-100">
      <img
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] w-[92vw] max-w-[1080px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-14"
        src="/akres-logo-full.png?v=6"
      />
      <div aria-hidden className="absolute inset-0 bg-black/32" />
      <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card className="w-full max-w-md rounded-[28px] border border-white/45 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_26px_70px_rgba(15,23,42,.16)] backdrop-blur-2xl">
            <CardHeader className="px-6 pb-2 pt-6">
              <CardTitle className="text-[2rem] leading-none">Masuk Akres Music</CardTitle>
              <p className="mt-2 text-sm text-zinc-600">
                Gunakan akun yang sudah dibuat admin/staff di menu Users.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <LoginError searchParams={searchParams} />
              <form action={credentialsLogin} className="space-y-3.5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium tracking-[0.02em] text-zinc-600">
                    Email
                  </span>
                  <input
                    className="h-12 w-full rounded-[16px] border border-white/60 bg-white/70 px-4 text-base text-zinc-900 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.6)] placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-300"
                    name="email"
                    placeholder="nama@email.com"
                    type="email"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium tracking-[0.02em] text-zinc-600">
                    Password
                  </span>
                  <PasswordInput name="password" />
                </label>
                <LoginSubmitButton />
              </form>
              <p className="pt-1 text-center text-xs text-zinc-600">
                User dibuat dan diatur dari dashboard Users oleh admin/staff.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
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
