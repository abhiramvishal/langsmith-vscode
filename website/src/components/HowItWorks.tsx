"use client";

import { motion } from "framer-motion";
import { Download, LayoutPanelLeft, Activity } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Install & Configure",
    desc: "Install the extension from the VS Code Marketplace and set your LangSmith API key.",
    icon: <Download className="w-5 h-5 text-fuchsia" />
  },
  {
    num: "02",
    title: "Browse Projects",
    desc: "Open the LangTrace sidebar to navigate your projects, select a run, and instantly view the trace.",
    icon: <LayoutPanelLeft className="w-5 h-5 text-mint" />
  },
  {
    num: "03",
    title: "Inspect Traces",
    desc: "Dive deep with our custom webview: chat bubbles, tokens, and a full latency waterfall.",
    icon: <Activity className="w-5 h-5 text-cyan" />
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-[#08080c] border-y border-white/5 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            From zero to full visibility in less than 60 seconds.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[2.5rem] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative z-10">
            {steps.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-[#0d0d14] border border-white/10 flex items-center justify-center mb-6 shadow-xl relative group">
                  <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {step.icon}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#1c1c24] border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-gray-400">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">
                  {step.title}
                </h3>
                <p className="text-gray-400 px-4 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
