"use client";

import { motion } from "framer-motion";
import { MessageSquare, AlignLeft, Folder, Hexagon, Search, Copy } from "lucide-react";

const features = [
  {
    icon: <MessageSquare className="w-6 h-6 text-fuchsia" />,
    title: "LLM Chat View",
    description: "LLM runs render as system/user/assistant chat bubbles, not raw JSON",
    color: "#e040fb", // fuchsia
    borderColor: "border-fuchsia"
  },
  {
    icon: <AlignLeft className="w-6 h-6 text-cyan" />,
    title: "Trace Waterfall",
    description: "Animated timeline bars show relative latency across every step",
    color: "#40d9ff", // cyan
    borderColor: "border-cyan"
  },
  {
    icon: <Folder className="w-6 h-6 text-mint" />,
    title: "Projects + Stats",
    description: "Error rate, p50/p99 latency, token counts per project at a glance",
    color: "#00e5a0", // mint
    borderColor: "border-mint"
  },
  {
    icon: <Hexagon className="w-6 h-6 text-coral" />,
    title: "Type-aware Icons",
    description: "LLM, chain, tool, retriever, embedding each get their own icon and color",
    color: "#ff6b35", // coral
    borderColor: "border-coral"
  },
  {
    icon: <Search className="w-6 h-6 text-amber" />,
    title: "Live Search",
    description: "Filter steps by name inside the trace panel instantly",
    color: "#ffd740", // amber
    borderColor: "border-amber"
  },
  {
    icon: <Copy className="w-6 h-6 text-success" />,
    title: "Copy Anywhere",
    description: "One-click copy on run IDs, JSON blocks, and individual messages",
    color: "#00ffb3", // success
    borderColor: "border-success"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function Features() {
  return (
    <section className="py-24 bg-background relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to debug LLMs</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Purpose-built views designed for AI engineers, integrated directly where you write code.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative bg-white/5 border border-white/10 rounded-xl p-6 overflow-hidden group shadow-lg`}
            >
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1 ${feature.borderColor} bg-current opacity-70 group-hover:opacity-100 transition-opacity`}
                style={{ color: feature.color }}
              ></div>
              
              <div className="mb-4 p-3 bg-white/5 rounded-lg inline-block">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Subtle hover glow */}
              <div 
                className="absolute inset-x-0 -bottom-px h-px w-1/2 mx-auto opacity-0 group-hover:opacity-100 transition-opacity blur-sm"
                style={{ backgroundColor: feature.color }}
              ></div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
