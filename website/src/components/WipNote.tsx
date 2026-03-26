export function WipNote() {
  return (
    <section className="py-12 bg-[#08080c] relative z-20 overflow-hidden border-t border-white/5">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="inline-flex items-center justify-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber"></span>
          </span>
          <span className="text-xs font-semibold tracking-widest text-[#a1a1aa] uppercase font-mono">
            Work in progress
          </span>
        </div>
        <p className="text-[#71717a] text-sm leading-relaxed max-w-xl mx-auto">
          This extension is actively being developed.
          The current release is a working v1 — a cleaner, faster, more polished version is already in progress. Stay tuned.
        </p>
      </div>
    </section>
  );
}
