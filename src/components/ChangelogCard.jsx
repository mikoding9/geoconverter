import { motion } from "motion/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export function ChangelogCard() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-4 text-sm text-emerald-200 shadow-2xl"
    >
      <div className="relative">
        <InformationCircleIcon className="-top-1 -right-1 absolute w-5 h-5 mt-0.5 text-emerald-300" />
        <p className="font-medium text-emerald-100 mb-1">Latest update</p>
        <p className="text-emerald-200/90 leading-relaxed">
          Main processing now runs in a dedicated web worker, enabling
          conversions up to 100 MB per file. Added support for non-zipped shp
          input.
        </p>
      </div>
    </motion.aside>
  );
}
