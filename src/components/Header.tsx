import { Package, Smartphone } from "lucide-react";

const ANDROID_APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "/releases/android-client.apk";

export default function Header() {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AAB Ops</h1>
            <p className="text-sm text-muted-foreground">
              Internal AAB Distribution Simplified
            </p>
          </div>
        </div>
        <a
          href={ANDROID_APK_URL}
          download="android-client.apk"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Smartphone className="h-4 w-4" />
          AAB Installer
        </a>
      </div>
    </header>
  );
}
