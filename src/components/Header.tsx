import { Package, Smartphone } from "lucide-react";

const ANDROID_APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "/releases/android-client.apk";

export default function Header() {
  return (
    <header className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10">
            <Package className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
              AAB Ops
            </h1>
            <p className="text-sm text-muted-foreground">
              Internal AAB Distribution Simplified
            </p>
          </div>
        </div>
        <a
          href={ANDROID_APK_URL}
          download="android-client.apk"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto sm:py-2"
        >
          <Smartphone className="h-4 w-4" />
          AAB Installer
        </a>
      </div>
    </header>
  );
}
