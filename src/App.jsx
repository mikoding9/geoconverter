import { useState, useEffect } from 'react'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Field, Label, Fieldset, FieldGroup } from '@/components/fieldset'
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
import { Text } from '@/components/text'

const SUPPORTED_FORMATS = [
  { value: 'geojson', label: 'GeoJSON', ext: '.geojson' },
  { value: 'shapefile', label: 'Shapefile (ZIP)', ext: '.zip' },
  { value: 'geopackage', label: 'GeoPackage', ext: '.gpkg' },
  { value: 'kml', label: 'KML', ext: '.kml' },
  { value: 'gpx', label: 'GPX', ext: '.gpx' },
  { value: 'gml', label: 'GML', ext: '.gml' },
]

// Common CRS options
const COMMON_CRS = [
  { value: '', label: 'No transformation' },
  { value: 'EPSG:4326', label: 'WGS 84 (EPSG:4326) - GPS coordinates' },
  { value: 'EPSG:3857', label: 'Web Mercator (EPSG:3857) - Web maps' },
  { value: 'EPSG:32633', label: 'UTM Zone 33N (EPSG:32633)' },
  { value: 'EPSG:32634', label: 'UTM Zone 34N (EPSG:32634)' },
  { value: 'EPSG:2154', label: 'Lambert 93 (EPSG:2154) - France' },
  { value: 'EPSG:27700', label: 'British National Grid (EPSG:27700)' },
  { value: 'EPSG:5514', label: 'S-JTSK Krovak (EPSG:5514) - Czech' },
  { value: 'custom', label: 'Custom CRS...' },
]

// Geometry type filter options
const GEOMETRY_TYPE_FILTERS = [
  { value: '', label: 'All geometry types' },
  { value: 'Point', label: 'Points only' },
  { value: 'LineString', label: 'Lines only' },
  { value: 'Polygon', label: 'Polygons only' },
  { value: 'MultiPoint', label: 'MultiPoints only' },
  { value: 'MultiLineString', label: 'MultiLines only' },
  { value: 'MultiPolygon', label: 'MultiPolygons only' },
]

function App() {
  const [gdalVersion, setGdalVersion] = useState('Initializing...')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [inputFormat, setInputFormat] = useState('geojson')
  const [outputFormat, setOutputFormat] = useState('shapefile')
  const [formatAutoDetected, setFormatAutoDetected] = useState(false)
  const [sourceCrs, setSourceCrs] = useState('')
  const [targetCrs, setTargetCrs] = useState('')
  const [customSourceCrs, setCustomSourceCrs] = useState('')
  const [customTargetCrs, setCustomTargetCrs] = useState('')
  const [layerName, setLayerName] = useState('')
  const [geometryTypeFilter, setGeometryTypeFilter] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    initCppJs().then(() => {
      setGdalVersion(Native.getGdalInfo());
      setIsLoading(false);
    });
  }, []);

  const detectFormatFromFile = (filename) => {
    const ext = filename.toLowerCase().split('.').pop()

    // Map file extensions to formats
    const extensionMap = {
      'json': 'geojson',
      'geojson': 'geojson',
      'zip': 'shapefile',
      'shp': 'shapefile',
      'gpkg': 'geopackage',
      'kml': 'kml',
      'gpx': 'gpx',
      'gml': 'gml',
    }

    return extensionMap[ext] || 'geojson' // Default to geojson
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)

      // Auto-detect input format from file extension
      const detectedFormat = detectFormatFromFile(file.name)
      setInputFormat(detectedFormat)
      setFormatAutoDetected(true)

      // Smart output format suggestion: if converting from shapefile, suggest geojson, vice versa
      if (detectedFormat === 'shapefile') {
        setOutputFormat('geojson')
      } else if (detectedFormat === 'geojson') {
        setOutputFormat('shapefile')
      }
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

      // Get final CRS values (use custom if 'custom' is selected)
      const finalSourceCrs = sourceCrs === 'custom' ? customSourceCrs : sourceCrs
      const finalTargetCrs = targetCrs === 'custom' ? customTargetCrs : targetCrs

      // Convert using GDAL through WebAssembly
      const outputVector = Native.convertVector(
        inputVector,
        actualInputFormat,
        outputFormat,
        finalSourceCrs,
        finalTargetCrs,
        layerName,
        geometryTypeFilter
      )

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

      // Create blob for download
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '')
      const outputBlob = new Blob([outputArray], { type: 'application/octet-stream' })
      const outputExt = SUPPORTED_FORMATS.find(f => f.value === outputFormat)?.ext || '.dat'

      // Trigger download
      const url = URL.createObjectURL(outputBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}${outputExt}`

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
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Format */}
                <Field>
                  <Label>
                    Input Format
                    {formatAutoDetected && (
                      <span className="ml-2 text-xs text-emerald-400 font-normal">
                        (auto-detected)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={inputFormat}
                    onChange={(e) => {
                      setInputFormat(e.target.value)
                      setFormatAutoDetected(false)
                    }}
                    className={formatAutoDetected ? 'ring-2 ring-emerald-500/30' : ''}
                  >
                    {SUPPORTED_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Output Format */}
                <Field>
                  <Label>Output Format</Label>
                  <Select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                  >
                    {SUPPORTED_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </FieldGroup>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              <span>Advanced Options (CRS Transformation)</span>
            </button>

            {/* Advanced Options - Collapsible */}
            {showAdvanced && (
              <Fieldset className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 space-y-6">
                {/* CRS Transformation Section */}
                <div className="space-y-4">
                  <Text className="font-medium text-zinc-300">
                    Coordinate Reference System (CRS) Transformation
                  </Text>
                  <Text className="text-sm text-zinc-500">
                    Reproject coordinates between different coordinate systems
                  </Text>

                  <FieldGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Source CRS */}
                      <Field>
                        <Label>Source CRS</Label>
                        <Select
                          value={sourceCrs}
                          onChange={(e) => setSourceCrs(e.target.value)}
                        >
                          {COMMON_CRS.map((crs) => (
                            <option key={crs.value} value={crs.value}>
                              {crs.label}
                            </option>
                          ))}
                        </Select>
                        {sourceCrs === 'custom' && (
                          <Input
                            type="text"
                            value={customSourceCrs}
                            onChange={(e) => setCustomSourceCrs(e.target.value)}
                            placeholder="e.g., EPSG:4326 or +proj=longlat..."
                            className="mt-2"
                          />
                        )}
                        <Text className="text-xs text-zinc-500 mt-2">
                          The CRS of your input data
                        </Text>
                      </Field>

                      {/* Target CRS */}
                      <Field>
                        <Label>Target CRS</Label>
                        <Select
                          value={targetCrs}
                          onChange={(e) => setTargetCrs(e.target.value)}
                        >
                          {COMMON_CRS.map((crs) => (
                            <option key={crs.value} value={crs.value}>
                              {crs.label}
                            </option>
                          ))}
                        </Select>
                        {targetCrs === 'custom' && (
                          <Input
                            type="text"
                            value={customTargetCrs}
                            onChange={(e) => setCustomTargetCrs(e.target.value)}
                            placeholder="e.g., EPSG:3857 or +proj=merc..."
                            className="mt-2"
                          />
                        )}
                        <Text className="text-xs text-zinc-500 mt-2">
                          The desired output CRS
                        </Text>
                      </Field>
                    </div>
                  </FieldGroup>
                </div>

                {/* Filtering Options */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <Text className="font-medium text-zinc-300">
                    Data Filtering
                  </Text>
                  <Text className="text-sm text-zinc-500">
                    Filter and customize the output data
                  </Text>

                  <FieldGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Layer Name */}
                      <Field>
                        <Label>Layer Name (optional)</Label>
                        <Input
                          type="text"
                          value={layerName}
                          onChange={(e) => setLayerName(e.target.value)}
                          placeholder="e.g., my_layer"
                        />
                        <Text className="text-xs text-zinc-500 mt-2">
                          Custom name for the output layer
                        </Text>
                      </Field>

                      {/* Geometry Type Filter */}
                      <Field>
                        <Label>Geometry Type Filter</Label>
                        <Select
                          value={geometryTypeFilter}
                          onChange={(e) => setGeometryTypeFilter(e.target.value)}
                        >
                          {GEOMETRY_TYPE_FILTERS.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Select>
                        <Text className="text-xs text-zinc-500 mt-2">
                          Only include specific geometry types
                        </Text>
                      </Field>
                    </div>
                  </FieldGroup>
                </div>
              </Fieldset>
            )}

            {/* Convert Button */}
            <Button
              color="emerald"
              onClick={handleConvert}
              disabled={!selectedFile || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon data-slot="icon" className="animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon data-slot="icon" />
                  <span>Convert & Download</span>
                </>
              )}
            </Button>
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
