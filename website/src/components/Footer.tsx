export function Footer() {
  return (
    <footer className="bg-[#08080c] border-t border-white/5 py-12 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-white font-bold tracking-wide">LangTrace</span>
            <span className="text-gray-500 text-sm">
              Unofficial community extension. Not affiliated with LangChain, Inc.
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-fuchsia transition-colors">
              Marketplace
            </a>
            <a href="#" className="hover:text-fuchsia transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-fuchsia transition-colors">
              MIT License
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
