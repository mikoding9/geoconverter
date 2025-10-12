import { useState, useEffect } from 'react'
import { Badge } from '@/components/badge'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { initCppJs, Native } from '@/native/native.h'

function App() {
  const [message, setMessage] = useState('Initializing...')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initCppJs().then(() => {
      setMessage(Native.getGdalInfo());
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Badge
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-6 py-3',
              'bg-zinc-900/80 backdrop-blur-sm border border-zinc-800',
              'text-sm font-medium text-zinc-400'
            )}
          >
            <InformationCircleIcon className="w-5 h-5" />
            <span>Powered by WebAssembly</span>
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={clsx(
            'text-5xl md:text-7xl font-light tracking-tight',
            isLoading ? 'text-zinc-600' : 'text-zinc-100'
          )}
        >
          {message}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-zinc-500 text-sm"
        >
          Geographic Data Abstraction Library
        </motion.div>
      </motion.div>
    </div>
  )
}

export default App
