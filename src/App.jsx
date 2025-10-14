import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Field, Label, Fieldset, FieldGroup } from '@/components/fieldset'
import { Switch } from '@/components/switch'
import {
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { motion } from 'motion/react'
import clsx from 'clsx'
import JSZip from 'jszip'
import { initCppJs, Native, VectorUint8 } from '@/native/native.h'
import { Text } from '@/components/text'
import { SupportedFormats, SUPPORTED_FORMATS } from '@/components/SupportedFormats'
import { FeedbackForm } from '@/components/FeedbackForm'
import { Toast } from '@/components/Toast'
import { HelpDialog } from '@/components/HelpDialog'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ParallaxStars } from '@/components/ParallaxStars'

// Common CRS options
const COMMON_CRS = [
  { value: '', label: 'No transformation' },
  { value: '+proj=longlat +datum=WGS84 +no_defs +type=crs', label: 'WGS 84 (Lat/Lon)' },
  { value: '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs', label: 'Web Mercator (Pseudo-Mercator)' },
  { value: '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs +type=crs', label: 'WGS 84 / UTM Zone 33N' },
  { value: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs +type=crs', label: 'Lambert 93 (France)' },
  { value: '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs +type=crs', label: 'British National Grid' },
  { value: 'custom', label: 'Custom PROJ string...' },
]

const EPSG_REGEX = /^epsg:(\d{1,6})$/i
const PROJ_ENDPOINTS = [
  (code) => `https://spatialreference.org/ref/epsg/${code}/proj4.txt`,
  (code) => `https://epsg.io/${code}.proj4`,
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
  const [isInitializing, setIsInitializing] = useState(true)
  const [isConverting, setIsConverting] = useState(false)
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

  // New advanced options
  const [skipFailures, setSkipFailures] = useState(false)
  const [makeValid, setMakeValid] = useState(false)
  const [keepZ, setKeepZ] = useState(false)
  const [whereClause, setWhereClause] = useState('')
  const [selectFields, setSelectFields] = useState('')
  const [simplifyTolerance, setSimplifyTolerance] = useState(0)
  const [explodeCollections, setExplodeCollections] = useState(true) // Default ON
  const [preserveFid, setPreserveFid] = useState(false)

  // Format-specific options
  const [geojsonPrecision, setGeojsonPrecision] = useState(7)
  const [csvGeometryMode, setCsvGeometryMode] = useState('WKT') // WKT or XY

  // Toast state
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })

  // Cached CRS lookups
  const projLookupCache = useRef({})
  const [resolvingSourceCrs, setResolvingSourceCrs] = useState(false)
  const [resolvingTargetCrs, setResolvingTargetCrs] = useState(false)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  // Help dialog state
  const [showHelp, setShowHelp] = useState(false)

  const debugTransformMessage = previewData?.debugTransform || ''
  const showBboxReprojectionFailure =
    previewData?.bboxReprojected === false &&
    Boolean(previewData?.bboxOriginal) &&
    debugTransformMessage &&
    !debugTransformMessage.includes('Already WGS84') &&
    !debugTransformMessage.includes('Source CRS is empty')

  useEffect(() => {
    initCppJs().then(() => {
      setGdalVersion(Native.getGdalInfo());
      setIsInitializing(false);
    });
  }, []);

  const detectFormatFromFile = (filename) => {
    const ext = filename.toLowerCase().split('.').pop()

    // Map file extensions to formats
    const extensionMap = {
      'json': 'geojson',
      'geojson': 'geojson',
      'topojson': 'topojson',
      'zip': 'shapefile',
      'shp': 'shapefile',
      'gpkg': 'geopackage',
      'kml': 'kml',
      'gpx': 'gpx',
      'gml': 'gml',
      'fgb': 'flatgeobuf',
      'csv': 'csv',
      'pmtiles': 'pmtiles',
      'mbtiles': 'mbtiles',
      'dxf': 'dxf',
    }

    return extensionMap[ext] || 'geojson' // Default to geojson
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewData(null) // Reset preview data

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

  const extractPreviewData = async () => {
    if (!selectedFile || isInitializing) return

    // Check if the module is initialized
    if (!Native || !VectorUint8) {
      setToast({
        isOpen: true,
        message: 'Please wait for the module to initialize.',
        type: 'error'
      })
      return
    }

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer()
      const inputArray = new Uint8Array(arrayBuffer)

      // Create a C++ vector from the Uint8Array
      const inputVector = new VectorUint8()
      for (let i = 0; i < inputArray.length; i++) {
        inputVector.push_back(inputArray[i])
      }

      // Get final source CRS (use custom if 'custom' is selected)
      const finalSourceCrs = sourceCrs === 'custom' ? customSourceCrs : sourceCrs

      // Call native GDAL method to extract metadata with user-selected CRS
      const jsonString = Native.getVectorInfo(inputVector, inputFormat, finalSourceCrs)
      inputVector.delete()

      // Parse the JSON response
      const metadata = JSON.parse(jsonString)

      if (metadata.error) {
        throw new Error(metadata.error)
      }

      setPreviewData(metadata)
      setShowPreview(true)
    } catch (error) {
      console.error('Error extracting preview data:', error)
      setToast({
        isOpen: true,
        message: 'Failed to extract preview data. ' + error.message,
        type: 'error'
      })
    }
  }

  const resolveEpsgCode = async (rawValue, scope) => {
    if (!rawValue) return
    const match = rawValue.trim().match(EPSG_REGEX)
    if (!match) return

    const code = match[1]
    const cacheKey = code
    const isSource = scope === 'source'
    const currentlyResolving = isSource ? resolvingSourceCrs : resolvingTargetCrs
    if (currentlyResolving) return

    const setValue = isSource ? setCustomSourceCrs : setCustomTargetCrs
    const setResolving = isSource ? setResolvingSourceCrs : setResolvingTargetCrs

    setResolving(true)

    try {
      let projString = projLookupCache.current[cacheKey]
      const fromCache = Boolean(projString)

      if (!projString) {
        let lastError = null

        for (const buildUrl of PROJ_ENDPOINTS) {
          const url = buildUrl(code)
          try {
            const response = await fetch(url, { mode: 'cors' })
            if (!response.ok) {
              lastError = new Error(`HTTP ${response.status}`)
              continue
            }
            const text = (await response.text()).trim()
            if (!text || !text.startsWith('+proj')) {
              lastError = new Error('Unexpected response format')
              continue
            }
            projString = text
            break
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
          }
        }

        if (!projString) {
          throw lastError || new Error('Unable to fetch PROJ definition')
        }

        projLookupCache.current[cacheKey] = projString
      }

      setValue(projString)

      if (!fromCache) {
        setToast({
          isOpen: true,
          message: `Resolved EPSG:${code} to PROJ string.`,
          type: 'success'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setToast({
        isOpen: true,
        message: `Failed to resolve EPSG:${code}. ${errorMessage}`,
        type: 'error'
      })
    } finally {
      setResolving(false)
    }
  }

  const handleSourceCustomBlur = () => {
    resolveEpsgCode(customSourceCrs, 'source')
  }

  const handleTargetCustomBlur = () => {
    resolveEpsgCode(customTargetCrs, 'target')
  }

  const handleConvert = async () => {
    if (!selectedFile) return

    try {
      setIsConverting(true)

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
        geometryTypeFilter,
        skipFailures,
        makeValid,
        keepZ,
        whereClause,
        selectFields,
        simplifyTolerance,
        explodeCollections,
        preserveFid,
        geojsonPrecision,
        csvGeometryMode
      )

      if (!outputVector || outputVector.size() === 0) {
        inputVector.delete()
        if (outputVector) outputVector.delete()
        console.log( Native.getLastError())
        const lastError = typeof Native.getLastError === 'function' ? Native.getLastError() : ''
        throw new Error(lastError || 'Conversion failed - output is empty')
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

      // Show success toast
      setToast({
        isOpen: true,
        message: 'Conversion successful! Your file is downloading.',
        type: 'success'
      })

    } catch (error) {
      const nativeError = typeof Native.getLastError === 'function' ? Native.getLastError() : ''
      console.error('Conversion error:', error, nativeError ? `Native: ${nativeError}` : '')
      setToast({
        isOpen: true,
        message: `Conversion failed: ${nativeError || error.message}`,
        type: 'error'
      })
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      background: 'radial-gradient(ellipse at bottom, #18181b 0%, #09090b 100%)'
    }}>
      {/* Parallax Star Background */}
      <ParallaxStars />

      {/* Header */}
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
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 h-9"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Help</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 relative z-[1]">
        <div className="max-w-7xl mx-auto">
          {/* Title Section */}
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

          {/* 3 Column Layout */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Updates & Supported Formats */}
            <div className="lg:col-span-3 space-y-4">
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-4 text-sm text-emerald-200 shadow-2xl"
              >
                <div className="relative">
                  <InformationCircleIcon className="-top-1 -right-1 absolute w-5 h-5 mt-0.5 text-emerald-300" />
                    <p className="font-medium text-emerald-100 mb-1">Latest update</p>
                    <p className="text-emerald-200/90 leading-relaxed">
                      Coordinate reprojection is now fixed for both the preview map and the main conversion workflow.
                    </p>
                </div>
              </motion.aside>

              <SupportedFormats className="w-full" />
            </div>

            {/* Center - Main Converter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="lg:col-span-6"
            >
              {/* Conversion Form */}
              <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-8 space-y-8 shadow-2xl">
            {/* File Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-300">
                  Input File
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={extractPreviewData}
                    disabled={isInitializing || resolvingSourceCrs || resolvingTargetCrs}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".json,.geojson,.zip,.gpkg,.kml,.gpx,.gml,.fgb,.csv,.pmtiles,.mbtiles"
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
                      {selectedFile ? selectedFile.name : 'Drop your file here or click to browse'}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                        : 'GeoJSON, Shapefile, GeoPackage, KML, GPX, and more'}
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
              <span>Advanced Options</span>
            </button>

            {/* Advanced Options - Collapsible */}
            {showAdvanced && (
              <Fieldset className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/50 space-y-6 backdrop-blur-sm">
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
                            onBlur={handleSourceCustomBlur}
                            placeholder="e.g., epsg:4326 or +proj=longlat +datum=WGS84 +no_defs"
                            className="mt-2"
                            disabled={resolvingSourceCrs}
                          />
                        )}
                        <Text className="text-xs text-zinc-500 mt-2">
                          {resolvingSourceCrs
                            ? 'Resolving EPSG code...'
                            : 'Source projection (PROJ string; leave empty to auto-detect)'}
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
                            onBlur={handleTargetCustomBlur}
                            placeholder="e.g., epsg:3857 or +proj=merc +lon_0=0 +k=1 +datum=WGS84"
                            className="mt-2"
                            disabled={resolvingTargetCrs}
                          />
                        )}
                        <Text className="text-xs text-zinc-500 mt-2">
                          {resolvingTargetCrs
                            ? 'Resolving EPSG code...'
                            : 'Transform to this projection (PROJ string; optional)'}
                        </Text>
                      </Field>
                    </div>
                  </FieldGroup>
                </div>

                {/* Processing Options */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <Text className="font-medium text-zinc-300">
                    Processing Options
                  </Text>
                  <Text className="text-sm text-zinc-500">
                    Control how features are processed during conversion
                  </Text>

                  <div className="space-y-4">
                    {/* Toggle Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field className="flex items-center justify-between">
                        <div>
                          <Label>Skip Failures</Label>
                          <Text className="text-xs text-zinc-500 mt-1">
                            Skip invalid features instead of failing entire conversion
                          </Text>
                        </div>
                        <Switch
                          checked={skipFailures}
                          onChange={setSkipFailures}
                        />
                      </Field>

                      <Field className="flex items-center justify-between">
                        <div>
                          <Label>Make Valid</Label>
                          <Text className="text-xs text-zinc-500 mt-1">
                            Auto-fix self-intersecting polygons and topology errors
                          </Text>
                        </div>
                        <Switch
                          checked={makeValid}
                          onChange={setMakeValid}
                        />
                      </Field>

                      <Field className="flex items-center justify-between">
                        <div>
                          <Label>Keep Z Dimension</Label>
                          <Text className="text-xs text-zinc-500 mt-1">
                            Preserve 3D coordinates (default: 2D)
                          </Text>
                        </div>
                        <Switch
                          checked={keepZ}
                          onChange={setKeepZ}
                        />
                      </Field>

                      <Field className="flex items-center justify-between">
                        <div>
                          <Label>Explode Collections</Label>
                          <Text className="text-xs text-zinc-500 mt-1">
                            Split GeometryCollections into simple features
                          </Text>
                        </div>
                        <Switch
                          checked={explodeCollections}
                          onChange={setExplodeCollections}
                        />
                      </Field>

                      <Field className="flex items-center justify-between">
                        <div>
                          <Label>Preserve FID</Label>
                          <Text className="text-xs text-zinc-500 mt-1">
                            Keep original feature IDs (for stable references)
                          </Text>
                        </div>
                        <Switch
                          checked={preserveFid}
                          onChange={setPreserveFid}
                        />
                      </Field>
                    </div>

                    {/* Simplify */}
                    <Field>
                      <Label>Simplify Tolerance (optional)</Label>
                      <Input
                        type="number"
                        value={simplifyTolerance}
                        onChange={(e) => setSimplifyTolerance(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        step="0.0001"
                        min="0"
                      />
                      <Text className="text-xs text-zinc-500 mt-2">
                        Reduce geometry vertices using Douglas-Peucker algorithm
                      </Text>
                      <Text className="text-xs text-zinc-600 mt-1">
                        0 = disabled. Try 0.0001–0.01 for web maps, higher values for less detail
                      </Text>
                    </Field>
                  </div>
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
                    <div className="grid grid-cols-1 gap-6">
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

                      {/* WHERE Clause */}
                      <Field>
                        <Label>Attribute Filter (WHERE clause)</Label>
                        <Input
                          type="text"
                          value={whereClause}
                          onChange={(e) => setWhereClause(e.target.value)}
                          placeholder='population > 100000 OR area > 50'
                        />
                        <Text className="text-xs text-zinc-500 mt-2">
                          SQL syntax. Examples: <code className="text-emerald-400 font-mono">type IN ("road","path")</code> or <code className="text-emerald-400 font-mono">area {">"} 1000</code>
                        </Text>
                      </Field>

                      {/* Field Selection */}
                      <Field>
                        <Label>Select Fields (optional)</Label>
                        <Input
                          type="text"
                          value={selectFields}
                          onChange={(e) => setSelectFields(e.target.value)}
                          placeholder="e.g., name,type,lanes"
                        />
                        <Text className="text-xs text-zinc-500 mt-2">
                          Comma-separated list of fields to include (empty = all fields)
                        </Text>
                      </Field>
                    </div>
                  </FieldGroup>
                </div>

                {/* Format-Specific Options */}
                {(outputFormat === 'geojson' || outputFormat === 'csv') && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <Text className="font-medium text-zinc-300">
                      Format-Specific Options
                    </Text>
                    <Text className="text-sm text-zinc-500">
                      Options specific to the output format
                    </Text>

                    <FieldGroup>
                      <div className="grid grid-cols-1 gap-6">
                        {/* GeoJSON Precision */}
                        {outputFormat === 'geojson' && (
                          <Field>
                            <Label>Coordinate Precision: {geojsonPrecision}</Label>
                            <input
                              type="range"
                              min="5"
                              max="10"
                              value={geojsonPrecision}
                              onChange={(e) => setGeojsonPrecision(parseInt(e.target.value))}
                              className="w-full"
                            />
                            <Text className="text-xs text-zinc-500 mt-2">
                              Number of decimal places for coordinates (5 = ~1m, 7 = ~1cm, 10 = ~1mm)
                            </Text>
                          </Field>
                        )}

                        {/* CSV Geometry Mode */}
                        {outputFormat === 'csv' && (
                          <Field>
                            <Label>Geometry Format</Label>
                            <Select
                              value={csvGeometryMode}
                              onChange={(e) => setCsvGeometryMode(e.target.value)}
                            >
                              <option value="WKT">WKT (Well-Known Text)</option>
                              <option value="XY">X/Y Columns</option>
                            </Select>
                            <Text className="text-xs text-zinc-500 mt-2">
                              How to represent geometries in CSV output
                            </Text>
                          </Field>
                        )}
                      </div>
                    </FieldGroup>
                  </div>
                )}

                {/* Automatic Features Info */}
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <Text className="font-medium text-zinc-300">
                    Built-in Optimizations
                  </Text>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <Text className="text-xs text-zinc-400">
                        <strong className="text-zinc-300">Shapefile Geometry Splitting:</strong> Mixed geometries automatically split by type (points, lines, polygons) with multi-promotion
                      </Text>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <Text className="text-xs text-zinc-400">
                        <strong className="text-zinc-300">Format Optimizations:</strong> GeoJSON with bbox, GeoPackage with spatial index, Shapefile with UTF-8, CSV with geometry handling
                      </Text>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <Text className="text-xs text-zinc-400">
                        <strong className="text-zinc-300">Smart CRS:</strong> Auto-detects existing CRS, intelligently assigns vs transforms based on source data
                      </Text>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">⚙</span>
                      <Text className="text-xs text-zinc-400">
                        <strong className="text-zinc-300">Default Behavior:</strong> 2D output (toggle "Keep Z"), explode collections ON, precision=7 for GeoJSON
                      </Text>
                    </div>
                  </div>
                </div>
              </Fieldset>
            )}

            {/* Convert Button */}
            <Button
              color="emerald"
              onClick={handleConvert}
              disabled={!selectedFile || isInitializing || isConverting}
              className="w-full"
            >
              {isInitializing ? (
                <>
                  <ArrowPathIcon data-slot="icon" className="animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : isConverting ? (
                <>
                  <ArrowPathIcon data-slot="icon" className="animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon data-slot="icon" />
                  <span>Convert & Download</span>
                </>
              )}
            </Button>
              </div>
            </motion.div>

            {/* Right Sidebar - Feedback Form */}
            <FeedbackForm />
          </motion.div>

          {/* Info Footer */}
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
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-zinc-900/95 border border-zinc-700/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Data Preview</h3>
                <p className="text-sm text-zinc-400 mt-0.5">{selectedFile.name}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Map Preview */}
              {previewData?.bbox && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <span>🗺️</span> Location Preview
                  </h4>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden aspect-video">
                    <Map
                      initialViewState={{
                        bounds: [
                          [previewData.bbox[0], previewData.bbox[1]], // southwest
                          [previewData.bbox[2], previewData.bbox[3]]  // northeast
                        ],
                        fitBoundsOptions: {
                          padding: 40
                        }
                      }}
                      style={{ width: '100%', height: '100%' }}
                      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    >
                      <Source
                        id="bbox-source"
                        type="geojson"
                        data={{
                          type: 'Feature',
                          geometry: {
                            type: 'Polygon',
                            coordinates: [[
                              [previewData.bbox[0], previewData.bbox[1]],
                              [previewData.bbox[2], previewData.bbox[1]],
                              [previewData.bbox[2], previewData.bbox[3]],
                              [previewData.bbox[0], previewData.bbox[3]],
                              [previewData.bbox[0], previewData.bbox[1]]
                            ]]
                          }
                        }}
                      >
                        <Layer
                          id="bbox-fill"
                          type="fill"
                          paint={{
                            'fill-color': '#10b981',
                            'fill-opacity': 0.1
                          }}
                        />
                        <Layer
                          id="bbox-outline"
                          type="line"
                          paint={{
                            'line-color': '#10b981',
                            'line-width': 2
                          }}
                        />
                      </Source>
                    </Map>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">
                      Bounding box: <span className="text-zinc-400 font-mono">
                        {previewData.bbox.map(v => v.toFixed(6)).join(', ')}
                      </span>
                      {previewData.bboxReprojected === true && (
                        <span className="ml-2 text-emerald-400">(reprojected to WGS84 for display)</span>
                      )}
                      {showBboxReprojectionFailure && (
                        <span className="ml-2 text-red-400">(reprojection failed - showing original)</span>
                      )}
                    </p>
                    {previewData.bboxOriginal && (
                      <p className="text-xs text-zinc-600">
                        Original bbox: <span className="font-mono">
                          {previewData.bboxOriginal.map(v => v.toFixed(2)).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <span>📝</span> File Information
                </h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">Format</p>
                      <p className="text-sm text-zinc-300 font-medium">{inputFormat.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">File Size</p>
                      <p className="text-sm text-zinc-300 font-medium">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Feature Count</p>
                      <p className="text-sm text-zinc-300 font-medium">
                        {previewData?.featureCount !== undefined
                          ? (typeof previewData.featureCount === 'number'
                              ? previewData.featureCount.toLocaleString()
                              : previewData.featureCount)
                          : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Geometry Type</p>
                      <p className="text-sm text-zinc-300 font-medium">
                        {previewData?.geometryType || 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">CRS</p>
                      <p className="text-sm text-zinc-300 font-medium">
                        {previewData?.crs || 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Layers</p>
                      <p className="text-sm text-zinc-300 font-medium">
                        {previewData?.layers ? `${previewData.layers} layer${previewData.layers > 1 ? 's' : ''}` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Properties Sample */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <span>🏷️</span> Data Attributes (First Feature)
                </h4>
                {previewData && previewData.properties && previewData.properties.length > 0 ? (
                  <>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900 border-b border-zinc-800">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400">Property</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400">Value</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {previewData.properties.map((prop, index) => (
                            <tr key={index} className="hover:bg-zinc-900/50">
                              <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{prop.name}</td>
                              <td className="px-4 py-2 text-zinc-300">
                                {prop.value !== null && prop.value !== undefined
                                  ? String(prop.value)
                                  : <span className="text-zinc-500 italic">null</span>}
                              </td>
                              <td className="px-4 py-2 text-zinc-500 text-xs">{prop.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-zinc-500 italic">
                      Showing properties from the first feature in the dataset.
                    </p>
                  </>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center">
                    <p className="text-sm text-zinc-500">
                      {previewData ? 'No properties found in the first feature.' : 'Loading properties...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />

      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

export default App
