import { motion } from 'motion/react'

export function InfoFooter() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="mt-8 text-center space-y-4"
    >
      {/* Geoverse CTA */}
      <div className="inline-block px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
        <p className="text-sm text-zinc-400">
          Need more than conversion?{' '}
          <a
            href="https://geoverse.mikoding.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium underline decoration-emerald-400/30 hover:decoration-emerald-300"
          >
            Try Geoverse
          </a>
          {' '}for full spatial data lifecycle
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Map visualization • Tabular view • SQL operations • Fully client-side
        </p>
      </div>

      {/* Powered by */}
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
