"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function AppLoader() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
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
          {t("states.loading")}
        </motion.span>
      </motion.div>
    </div>
  );
}
