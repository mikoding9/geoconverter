import { motion } from 'motion/react'

export function TitleSection() {
  return (
    <div className="text-center mb-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-3xl md:text-4xl font-light tracking-tight text-zinc-100 mb-3"
      >
        Convert Geospatial Files Instantly
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-zinc-400 text-base"
      >
        Transform GIS vector data between formats, powered by GDAL
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-sm text-zinc-500 mt-2 flex items-center justify-center gap-1.5"
      >
        <span>🔒</span>
        <span>100% client-side processing. Your files never leave your browser.</span>
      </motion.p>
    </div>
  )
}
