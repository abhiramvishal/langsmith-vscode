"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";

export function TracePanel() {
  return (
    <section className="py-24 bg-background relative z-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">The trace panel you deserve</h2>
          <p className="text-gray-400 text-lg">
            Say goodbye to endless JSON. We built a native-feeling VS Code viewer.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative rounded-xl border border-white/10 bg-[#12121e] shadow-2xl overflow-hidden"
        >
          {/* Top Border Gradient */}
          <div className="h-1 w-full bg-gradient-to-r from-fuchsia via-mint to-cyan"></div>
          
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between p-4 border-b border-white/5 bg-[#181824]">
            <div className="flex items-center gap-4">
              <h3 className="font-mono font-bold text-lg text-white">RunnableSequence</h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-success/10 border border-success/20 text-success text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Success</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono mt-3 sm:mt-0">
              <div className="px-3 py-1.5 rounded bg-white/5 text-gray-300">
                Latency: <span className="text-white">3.4s</span>
              </div>
              <div className="px-3 py-1.5 rounded bg-white/5 text-gray-300">
                Tokens: <span className="text-white">1,402</span>
              </div>
            </div>
          </div>

          {/* Trace Content */}
          <div className="p-4 space-y-3 font-sans">
            
            {/* Step 1: Retriever */}
            <div className="rounded border border-white/5 bg-white/5 p-3 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                  <span className="font-mono font-semibold text-sm">VectorStoreRetriever</span>
                </div>
                <span className="text-xs font-mono text-gray-500">850ms</span>
              </div>
              
              {/* Waterfall Timeline Bar */}
              <div className="w-full h-1.5 bg-background rounded-full mt-1 overflow-hidden flex">
                <div className="w-[10%]"></div>
                <div className="w-[25%] h-full bg-cyan/60 rounded-full"></div>
                <div className="w-[65%]"></div>
              </div>
            </div>

            {/* Step 2: LLM Call with Chat Bubbles */}
            <div className="rounded border border-white/5 bg-[#1a1a2e] p-3 flex flex-col gap-3 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                  <span className="font-mono font-semibold text-sm">ChatOpenAI: summarize_docs</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-mono bg-white/5 px-1.5 rounded text-gray-400">gpt-4o</span>
                  <span className="text-xs font-mono text-gray-500">2.4s</span>
                </div>
              </div>

              {/* Timeline Bar */}
              <div className="w-full h-1.5 bg-background rounded-full overflow-hidden flex">
                <div className="w-[30%]"></div>
                <div className="w-[70%] h-full bg-fuchsia/60 rounded-full"></div>
              </div>

              {/* Chat Bubbles */}
              <div className="pl-6 pt-2 space-y-4">
                
                {/* System Message */}
                <div className="flex flex-col gap-1 w-full max-w-2xl">
                  <span className="text-xs font-mono text-amber mb-0.5">system</span>
                  <div className="px-4 py-3 rounded-xl rounded-tl-sm border border-amber/20 bg-amber/5 text-sm text-gray-300 leading-relaxed">
                    You are a helpful assistant. Use the retrieved context to answer the user&apos;s question accurately.
                  </div>
                </div>

                {/* User Message */}
                <div className="flex flex-col gap-1 w-full max-w-2xl">
                  <span className="text-xs font-mono text-cyan mb-0.5">user</span>
                  <div className="px-4 py-3 rounded-xl rounded-tl-sm border border-cyan/20 bg-cyan/5 text-sm text-gray-300 leading-relaxed">
                    What are the key benefits of LangSmith according to the docs?
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex flex-col gap-1 w-full max-w-2xl">
                  <span className="text-xs font-mono text-mint mb-0.5">assistant</span>
                  <div className="px-4 py-3 rounded-xl rounded-tl-sm border border-mint/20 bg-mint/5 text-sm text-gray-200 leading-relaxed shadow-[0_0_15px_-3px_rgba(0,229,160,0.15)]">
                    Based on the retrieved context, the key benefits of LangSmith include:<br/>
                    1. <strong>Visibility:</strong> Full tracing for LLM applications and chains.<br/>
                    2. <strong>Testing:</strong> Datasets and evaluators for prompt refinement.<br/>
                    3. <strong>Monitoring:</strong> Production metrics like token usage and latency.
                  </div>
                </div>

              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
