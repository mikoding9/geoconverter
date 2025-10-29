import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

export function Toast({ message, type = 'success', isOpen, onClose, duration = 5000 }) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50 max-w-md"
        >
          <div
            className={clsx(
              'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border',
              type === 'success' && 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100',
              type === 'error' && 'bg-red-500/10 border-red-500/50 text-red-100'
            )}
          >
            {type === 'success' && (
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            )}
            {type === 'error' && (
              <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}

            <p className="text-sm flex-1">{message}</p>

            <button
              onClick={onClose}
              className={clsx(
                'flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors',
                type === 'success' && 'text-emerald-400 hover:text-emerald-300',
                type === 'error' && 'text-red-400 hover:text-red-300'
              )}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
