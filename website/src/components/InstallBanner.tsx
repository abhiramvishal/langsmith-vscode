"use client";

import { motion } from "framer-motion";
import { Copy, Terminal, ArrowRight } from "lucide-react";
import { useState } from "react";

export function InstallBanner() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("ext install langtrace-vscode");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 bg-background relative z-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-fuchsia/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to see your traces?</h2>
        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          Get started in seconds. No complex setup, just run the command below in your VS Code terminal.
        </p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-8"
        >
          {/* Terminal Block */}
          <div className="relative group w-full max-w-lg">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia to-cyan rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500 hidden sm:block"></div>
            <div className="relative flex items-center justify-between bg-[#12121e] border border-white/10 rounded-lg p-4 font-mono text-sm sm:text-base cursor-text">
              <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <Terminal className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="text-fuchsia shrink-0">&gt;</span>
                <span className="text-gray-200">ext install langtrace-vscode</span>
              </div>
              <button 
                onClick={handleCopy}
                className="ml-4 p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                title="Copy to clipboard"
              >
                {copied ? (
                  <span className="text-success text-xs font-sans font-medium">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <a 
            href="#"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-fuchsia text-white font-medium hover:bg-fuchsia/90 transition-all shadow-[0_0_40px_-10px_rgba(224,64,251,0.5)] hover:shadow-[0_0_60px_-15px_rgba(224,64,251,0.7)]"
          >
            Install from Marketplace
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
