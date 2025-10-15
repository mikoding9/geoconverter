import { motion } from 'motion/react'

export function InfoFooter() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="mt-8 text-center space-y-2"
    >
      <p className="text-sm text-zinc-500">
        Powered by{' '}
        <a
          href="https://gdal.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-emerald-400 transition-colors underline decoration-dotted"
        >
          GDAL
        </a>
        {' '}via{' '}
        <a
          href="https://github.com/bugra9/cpp.js"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-emerald-400 transition-colors underline decoration-dotted"
        >
          cpp.js
        </a>
        {' '}and{' '}
        <a
          href="https://webassembly.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-emerald-400 transition-colors underline decoration-dotted"
        >
          WebAssembly
        </a>
      </p>
    </motion.div>
  )
}
