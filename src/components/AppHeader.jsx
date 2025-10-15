import clsx from 'clsx'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import {
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export function AppHeader({ gdalVersion, isInitializing, onHelpClick }) {
  return (
    <header className="border-b border-zinc-700/50 backdrop-blur-md bg-zinc-900/90 sticky top-0 z-10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-100">GeoConverter</h1>
            <Badge
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
                'bg-zinc-900/80 backdrop-blur-sm border border-zinc-800',
                'text-xs font-medium text-zinc-400'
              )}
            >
              <InformationCircleIcon className="w-3.5 h-3.5" />
              <span>{isInitializing ? 'Loading...' : gdalVersion}</span>
            </Badge>
          </div>
          <Button
            outline
            onClick={onHelpClick}
            className="flex items-center gap-2 h-9"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Help</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
