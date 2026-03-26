"use client";

import { motion } from "framer-motion";
import { ArrowRight, Code2, Play, TerminalSquare, Database } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background pt-20 pb-32">
      {/* Background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-fuchsia rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-mint rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-blob animation-delay-4000"></div>
      
      {/* Grain overlay */}
      <div className="grain-overlay"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column: Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col space-y-8"
          >
            <div className="flex flex-wrap items-center gap-3 text-sm font-mono text-gray-400">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                VS Code Marketplace
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                MIT License
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-mint">
                Unofficial community extension
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance leading-tight">
              Your LangSmith traces. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia to-cyan">Right in VS Code.</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
              Browse projects, debug runs, inspect prompts and tool calls — without switching tabs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a 
                href="https://marketplace.visualstudio.com/items?itemName=langtrace-vscode.langtrace-vscode"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-fuchsia text-white font-medium hover:bg-fuchsia/90 transition-all shadow-[0_0_40px_-10px_rgba(224,64,251,0.5)] hover:shadow-[0_0_60px_-15px_rgba(224,64,251,0.7)]"
              >
                Install from Marketplace
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Right Column: Floating Sidebar Mock */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative perspective-1000"
          >
            <div className="relative rounded-xl border border-white/10 bg-[#181818] shadow-2xl overflow-hidden flex flex-col h-[500px]">
              {/* Sidebar Header */}
              <div className="flex items-center px-4 py-3 border-b border-white/5 text-xs font-mono text-gray-400 uppercase tracking-widest bg-[#1e1e1e]">
                Explorer: LangTrace
              </div>
              
              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-2 font-mono text-sm space-y-1">
                
                {/* Project Item */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-300 cursor-default">
                  <Database className="w-4 h-4 text-mint" />
                  <span>production-rag</span>
                </div>
                
                {/* Runs under project */}
                <div className="pl-6 space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 text-white cursor-default border-l-2 border-fuchsia">
                    <Code2 className="w-4 h-4 text-fuchsia" />
                    <span className="truncate">ChatOpenAI: summarize...</span>
                    <span className="ml-auto text-xs text-success">2.4s</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 cursor-default">
                    <Play className="w-4 h-4 text-mint" />
                    <span className="truncate">RunnableSequence</span>
                    <span className="ml-auto text-xs text-gray-500">1.1s</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 cursor-default">
                    <TerminalSquare className="w-4 h-4 text-coral" />
                    <span className="truncate">TavilySearch</span>
                    <span className="ml-auto text-xs text-gray-500">800ms</span>
                  </div>
                </div>

                {/* Another Project Item */}
                <div className="flex items-center gap-2 px-2 py-1.5 mt-4 rounded hover:bg-white/5 text-gray-300 cursor-default">
                  <Database className="w-4 h-4 text-cyan" />
                  <span>eval-dataset-v2</span>
                </div>
                <div className="pl-6 space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 cursor-default">
                    <Code2 className="w-4 h-4 text-error" />
                    <span className="truncate">ChatAnthropic: QA...</span>
                    <span className="ml-auto text-xs text-error">Failed</span>
                  </div>
                </div>

              </div>
              
              {/* Bottom Status Bar */}
              <div className="flex items-center px-4 py-1.5 bg-[#007acc] text-white text-xs">
                <span>LangTrace: Connected to default-project</span>
              </div>
            </div>
            
            {/* Decorative Glow behind sidebar */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-fuchsia to-cyan rounded-xl blur-2xl opacity-20 -z-10"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
