import { useState, useEffect } from 'react'
import { Badge } from '@/components/badge'
import {
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { motion } from 'motion/react'
import clsx from 'clsx'
import JSZip from 'jszip'
import { initCppJs, Native, VectorUint8 } from '@/native/native.h'

const SUPPORTED_FORMATS = [
  { value: 'geojson', label: 'GeoJSON', ext: '.geojson' },
  { value: 'shapefile', label: 'Shapefile (ZIP)', ext: '.zip' },
  { value: 'geopackage', label: 'GeoPackage', ext: '.gpkg' },
  { value: 'kml', label: 'KML', ext: '.kml' },
  { value: 'gpx', label: 'GPX', ext: '.gpx' },
  { value: 'gml', label: 'GML', ext: '.gml' },
]

function App() {
  const [gdalVersion, setGdalVersion] = useState('Initializing...')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [inputFormat, setInputFormat] = useState('geojson')
  const [outputFormat, setOutputFormat] = useState('shapefile')

  useEffect(() => {
    initCppJs().then(() => {
      setGdalVersion(Native.getGdalInfo());
      setIsLoading(false);
    });
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleConvert = async () => {
    if (!selectedFile) return

    try {
      setIsLoading(true)

      let inputArray
      let actualInputFormat = inputFormat

      // Handle ZIP files for shapefiles
      if (selectedFile.name.endsWith('.zip') && inputFormat === 'shapefile') {
        // Extract the shapefile from ZIP
        const arrayBuffer = await selectedFile.arrayBuffer()
        const zip = await JSZip.loadAsync(arrayBuffer)

        // Find the .shp file in the ZIP
        const shpFile = Object.keys(zip.files).find(name => name.endsWith('.shp'))
        if (!shpFile) {
          throw new Error('No .shp file found in the ZIP archive')
        }

        // For now, we need to pass the whole ZIP to GDAL
        // GDAL can read from /vsizip/ paths
        inputArray = new Uint8Array(arrayBuffer)
      } else {
        // Read the file as ArrayBuffer
        const arrayBuffer = await selectedFile.arrayBuffer()
        inputArray = new Uint8Array(arrayBuffer)
      }

      // Create a C++ vector from the Uint8Array
      const inputVector = new VectorUint8()
      for (let i = 0; i < inputArray.length; i++) {
        inputVector.push_back(inputArray[i])
      }

      // Convert using GDAL through WebAssembly
      const outputVector = Native.convertVector(inputVector, actualInputFormat, outputFormat)

      if (!outputVector || outputVector.size() === 0) {
        inputVector.delete()
        if (outputVector) outputVector.delete()
        throw new Error('Conversion failed - output is empty')
      }

      // Convert C++ vector back to Uint8Array
      const outputSize = outputVector.size()
      const outputArray = new Uint8Array(outputSize)
      for (let i = 0; i < outputSize; i++) {
        outputArray[i] = outputVector.get(i)
      }

      // Clean up C++ objects
      inputVector.delete()
      outputVector.delete()

      // Handle ZIP for shapefile output
      let finalBlob
      let finalExtension
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '')

      if (outputFormat === 'shapefile') {
        // Shapefile output needs to be zipped
        // For now, assume GDAL returns a single file that we need to zip
        // In reality, GDAL creates multiple files for shapefiles
        const zip = new JSZip()
        zip.file(`${baseName}.shp`, outputArray)

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        finalBlob = zipBlob
        finalExtension = '.zip'
      } else {
        // Other formats
        finalBlob = new Blob([outputArray], { type: 'application/octet-stream' })
        finalExtension = SUPPORTED_FORMATS.find(f => f.value === outputFormat)?.ext || '.dat'
      }

      // Trigger download
      const url = URL.createObjectURL(finalBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}${finalExtension}`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Show success (you can add a toast notification here)
      console.log('Conversion successful!')

    } catch (error) {
      console.error('Conversion error:', error)
      alert('Conversion failed: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-950/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                <span>{isLoading ? 'Loading...' : gdalVersion}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-3xl"
        >
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl font-light tracking-tight text-zinc-100 mb-4"
            >
              Convert Vector Files
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-zinc-400 text-lg"
            >
              Transform geospatial data between formats, powered by GDAL
            </motion.p>
          </div>

          {/* Conversion Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 space-y-8"
          >
            {/* File Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-300">
                Input File
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".json,.geojson,.zip,.gpkg,.kml,.gpx,.gml"
                />
                <label
                  htmlFor="file-upload"
                  className={clsx(
                    'flex items-center justify-center gap-3 px-6 py-12',
                    'border-2 border-dashed rounded-xl cursor-pointer',
                    'transition-all duration-200',
                    selectedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30'
                  )}
                >
                  <DocumentArrowUpIcon className="w-8 h-8 text-zinc-400" />
                  <div className="text-center">
                    <p className="text-zinc-300 font-medium">
                      {selectedFile ? selectedFile.name : 'Choose a file or drag it here'}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                        : 'Supports GeoJSON, Shapefile (ZIP), GeoPackage, KML, GPX, GML'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Format Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Format */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">
                  Input Format
                </label>
                <select
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  className={clsx(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-900 border border-zinc-700',
                    'text-zinc-100 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500',
                    'transition-all duration-200'
                  )}
                >
                  {SUPPORTED_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Output Format */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">
                  Output Format
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className={clsx(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-900 border border-zinc-700',
                    'text-zinc-100 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500',
                    'transition-all duration-200'
                  )}
                >
                  {SUPPORTED_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Convert Button */}
            <button
              onClick={handleConvert}
              disabled={!selectedFile || isLoading}
              className={clsx(
                'w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl',
                'font-medium text-base transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900',
                selectedFile && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>Convert & Download</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Info Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-zinc-500">
              All processing happens in your browser using WebAssembly. Your files never leave your device.
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

export default App
