import Link from "next/link";

export function Nav({ active }: { active?: "build" | "progress" }) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm transition ${active === key ? "bg-white/10 text-white" : "text-mute hover:text-white"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="no-print mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
      <Link href="/" className="font-display text-2xl">
        Forge
      </Link>
      <div className="flex items-center gap-1">
        {link("/build", "My plan", "build")}
        {link("/progress", "Progress", "progress")}
      </div>
    </nav>
  );
}
