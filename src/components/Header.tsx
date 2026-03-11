import { Package } from "lucide-react";

export default function Header() {
  return (
    <header className="mb-8">
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
    </header>
  );
}
