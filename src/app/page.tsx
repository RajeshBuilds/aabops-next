import Header from "@/components/Header";
import UploadForm from "@/components/UploadForm";
import BundleList from "@/components/BundleList";
import { listBundles } from "@/lib/bundles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const bundles = await listBundles();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Header />
      <UploadForm />
      <BundleList bundles={bundles} />
    </main>
  );
}
