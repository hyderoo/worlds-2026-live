import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid place-items-center py-32 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="display text-5xl">Off the map</h1>
      <p className="mt-3 text-fog">That page does not exist.</p>
      <Link href="/" className="mt-6 rounded-full border border-gold px-5 py-2 text-gold hover:bg-gold/10">Back home</Link>
    </div>
  );
}
