"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SectionLoader() {
  return (
    <div className="z-50 flex items-center justify-center bg-background p-10 rounded-lg h-96">
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Spinner */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />

        {/* Animated Text */}
        <motion.span
          className="text-lg font-medium text-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.span>
      </motion.div>
    </div>
  );
}
