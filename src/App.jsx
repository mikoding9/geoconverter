import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/button'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Field, Label, Fieldset, FieldGroup } from '@/components/fieldset'
import { Switch } from '@/components/switch'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel } from '@/components/dropdown'
import {
  ArrowPathIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { motion } from 'motion/react'
import clsx from 'clsx'
import JSZip from 'jszip'
import proj4 from 'proj4'
import { initCppJs, Native, VectorUint8 } from '@/native/native.h'
import { Text } from '@/components/text'
import { SupportedFormats, SUPPORTED_FORMATS } from '@/components/SupportedFormats'
import { ChangelogCard } from '@/components/ChangelogCard'
import { FeedbackForm } from '@/components/FeedbackForm'
import { Toast } from '@/components/Toast'
import { HelpDialog } from '@/components/HelpDialog'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ParallaxStars } from '@/components/ParallaxStars'
import { TitleSection } from '@/components/TitleSection'
import { InfoFooter } from '@/components/InfoFooter'
import { PreviewModal } from '@/components/PreviewModal'
import { AppHeader } from '@/components/AppHeader'

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

const FORMAT_LOOKUP = SUPPORTED_FORMATS.reduce((acc, format) => {
  acc[format.value] = format
  return acc
}, {})

const READABLE_FORMATS = SUPPORTED_FORMATS.filter((format) => format.capabilities.read)
const WRITABLE_FORMATS = SUPPORTED_FORMATS.filter((format) => format.capabilities.write)

const DEFAULT_INPUT_FORMAT =
  READABLE_FORMATS.find((format) => format.value === 'geojson')?.value ??
  READABLE_FORMATS[0]?.value ??
  ''

const DEFAULT_OUTPUT_FORMAT =
  WRITABLE_FORMATS.find((format) => format.value === 'shapefile')?.value ??
  WRITABLE_FORMATS.find((format) => format.value === 'geojson')?.value ??
  WRITABLE_FORMATS[0]?.value ??
  ''

const INPUT_ACCEPT_ATTRIBUTE = Array.from(
  new Set(
    READABLE_FORMATS.flatMap((format) =>
      Array.isArray(format.extensions) ? format.extensions : []
    )
  )
)
  .map((ext) => {
    if (!ext) return null
    const normalized = ext.startsWith('.') ? ext : `.${ext}`
    return normalized.toLowerCase()
  })
  .filter(Boolean)
  .join(',')

function App() {
  const [gdalVersion, setGdalVersion] = useState('Initializing...')
  const [isInitializing, setIsInitializing] = useState(true)
  const [isConverting, setIsConverting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [inputFormat, setInputFormat] = useState(DEFAULT_INPUT_FORMAT)
  const [outputFormat, setOutputFormat] = useState(DEFAULT_OUTPUT_FORMAT)
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

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)

  const debugTransformMessage = previewData?.debugTransform || ''

  // Check if the CRS is already WGS84 (EPSG:4326)
  const crs = previewData?.crs || ''
  const isAlreadyWgs84 =
    crs === 'EPSG:4326' ||
    crs === 'WGS84' ||
    crs === 'WGS 84' ||
    crs.includes('WGS84') ||
    debugTransformMessage.includes('Already WGS84')

  // Only show reprojection failure message if:
  // 1. Reprojection was actually attempted (bboxReprojected === false)
  // 2. There's a bboxOriginal (meaning coordinates exist)
  // 3. There's a debug message explaining the failure
  // 4. The failure wasn't due to:
  //    - Already being in WGS84 (no transform needed)
  //    - Missing source CRS info (can't determine what to transform from)
  //    - No CRS provided by user (auto-detect scenario with no embedded CRS)
  const isNoTransformNeeded =
    isAlreadyWgs84 ||
    debugTransformMessage.includes('Source CRS is empty') ||
    debugTransformMessage.includes('No reprojection needed') ||
    (debugTransformMessage.includes('No sourceCrs provided') && crs === 'Unknown')

  const showBboxReprojectionFailure =
    previewData?.bboxReprojected === false &&
    Boolean(previewData?.bboxOriginal) &&
    debugTransformMessage &&
    !isNoTransformNeeded

  useEffect(() => {
    initCppJs().then(() => {
      setGdalVersion(Native.getGdalInfo());
      setIsInitializing(false);
    });
  }, []);

  const detectFormatFromFile = (filename) => {
    if (!filename) return null

    const lowerName = filename.toLowerCase()
    let matchedFormat = null
    let longestMatch = 0

    for (const format of SUPPORTED_FORMATS) {
      if (!Array.isArray(format.extensions)) continue
      for (const rawExtension of format.extensions) {
        if (!rawExtension) continue
        const normalized = rawExtension.startsWith('.')
          ? rawExtension.toLowerCase()
          : `.${rawExtension.toLowerCase()}`

        if (lowerName.endsWith(normalized) && normalized.length > longestMatch) {
          matchedFormat = format.value
          longestMatch = normalized.length
        }
      }
    }

    return matchedFormat
  }

  const isFileSupported = (filename) => {
    return detectFormatFromFile(filename) !== null
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const processFiles = (files) => {
    if (!files || files.length === 0) return

    // Validate files and separate supported from unsupported
    const supportedFiles = []
    const unsupportedFiles = []

    files.forEach(file => {
      if (isFileSupported(file.name)) {
        supportedFiles.push(file)
      } else {
        unsupportedFiles.push(file.name)
      }
    })

    // Show error for unsupported files
    if (unsupportedFiles.length > 0) {
      const fileList = unsupportedFiles.slice(0, 5).join(', ')
      const extra = unsupportedFiles.length > 5 ? ` and ${unsupportedFiles.length - 5} more` : ''
      setToast({
        isOpen: true,
        message: `Unsupported file format${unsupportedFiles.length > 1 ? 's' : ''}: ${fileList}${extra}`,
        type: 'error'
      })
    }

    // If no supported files, return early
    if (supportedFiles.length === 0) {
      return
    }

    setSelectedFiles(supportedFiles)
    setPreviewData(null) // Reset preview data

    // Auto-detect input format from first file's extension
    const firstFile = supportedFiles[0]
    const detectedFormat = detectFormatFromFile(firstFile.name)
    const nextInputFormat = detectedFormat ?? DEFAULT_INPUT_FORMAT

    setInputFormat(nextInputFormat)
    setFormatAutoDetected(Boolean(detectedFormat))

    const geojsonAvailable = WRITABLE_FORMATS.some((format) => format.value === 'geojson')
    const shapefileAvailable = WRITABLE_FORMATS.some((format) => format.value === 'shapefile')

    if (detectedFormat === 'shapefile' && geojsonAvailable) {
      setOutputFormat('geojson')
    } else if (detectedFormat === 'geojson' && shapefileAvailable) {
      setOutputFormat('shapefile')
    } else if (!WRITABLE_FORMATS.some((format) => format.value === outputFormat)) {
      setOutputFormat(DEFAULT_OUTPUT_FORMAT)
    } else if (detectedFormat && !FORMAT_LOOKUP[detectedFormat]?.capabilities.write) {
      setOutputFormat(DEFAULT_OUTPUT_FORMAT)
    }
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const items = e.dataTransfer?.items
    if (!items) {
      const files = Array.from(e.dataTransfer?.files || [])
      if (files.length > 0) {
        processFiles(files)
      }
      return
    }

    // Handle folders and multiple files
    const allFiles = []
    const entries = Array.from(items).map(item => item.webkitGetAsEntry())

    const readEntry = async (entry) => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => resolve(file))
        })
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader()
        return new Promise((resolve) => {
          const files = []
          const readEntries = () => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve(files)
              } else {
                for (const entry of entries) {
                  const result = await readEntry(entry)
                  if (Array.isArray(result)) {
                    files.push(...result)
                  } else if (result) {
                    files.push(result)
                  }
                }
                readEntries()
              }
            })
          }
          readEntries()
        })
      }
    }

    for (const entry of entries) {
      if (entry) {
        const result = await readEntry(entry)
        if (Array.isArray(result)) {
          allFiles.push(...result)
        } else if (result) {
          allFiles.push(result)
        }
      }
    }

    if (allFiles.length > 0) {
      processFiles(allFiles)
    }
  }

  /**
   * Transform a bounding box to WGS84 using proj4.js as fallback
   * when native PROJ transformation fails
   */
  const transformBboxWithProj4 = async (bbox, sourceCrs) => {
    if (!bbox || bbox.length !== 4) {
      throw new Error('Invalid bbox format')
    }

    // Parse CRS - extract EPSG code or use as PROJ string
    let proj4Def = null
    const epsgMatch = sourceCrs.match(/EPSG:(\d+)/i)

    if (epsgMatch) {
      const epsgCode = epsgMatch[1]
      // Try to get PROJ4 definition from epsg.io
      try {
        const response = await fetch(`https://epsg.io/${epsgCode}.proj4`, { mode: 'cors' })
        if (response.ok) {
          proj4Def = await response.text()
          console.log(`Fetched PROJ4 definition for EPSG:${epsgCode}:`, proj4Def)
        }
      } catch (error) {
        console.warn(`Failed to fetch PROJ4 definition for EPSG:${epsgCode}`, error)
      }

      // Fallback: use EPSG code directly (proj4 has some built-in definitions)
      if (!proj4Def) {
        proj4Def = `EPSG:${epsgCode}`
      }
    } else {
      // Assume sourceCrs is already a PROJ string
      proj4Def = sourceCrs
    }

    // Define WGS84
    const wgs84 = 'EPSG:4326'

    // Sample 8 points along each edge (same as native code)
    const [minX, minY, maxX, maxY] = bbox
    const points = []
    const steps = 8

    // Helper to add edge points
    const addEdge = (x0, y0, x1, y1) => {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        points.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
      }
    }

    // Sample edges (bottom, right, top, left)
    addEdge(minX, minY, maxX, minY)
    addEdge(maxX, minY, maxX, maxY)
    addEdge(maxX, maxY, minX, maxY)
    addEdge(minX, maxY, minX, minY)

    // Transform all points
    const transformer = proj4(proj4Def, wgs84)
    const transformedPoints = points.map(([x, y]) => {
      const result = transformer.forward([x, y])
      return result
    })

    // Find min/max of transformed points
    const xs = transformedPoints.map(p => p[0])
    const ys = transformedPoints.map(p => p[1])

    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }

  const extractPreviewData = async (fileToPreview = null) => {
    if (!selectedFiles || selectedFiles.length === 0 || isInitializing) return

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
      // Use specified file or default to first file
      const selectedFile = fileToPreview || selectedFiles[0]
      const arrayBuffer = await selectedFile.arrayBuffer()
      const inputArray = new Uint8Array(arrayBuffer)

      // Create a C++ vector from the Uint8Array
      const inputVector = new VectorUint8()
      for (let i = 0; i < inputArray.length; i++) {
        inputVector.push_back(inputArray[i])
      }

      // Get final source CRS (use custom if 'custom' is selected)
      const finalSourceCrs = sourceCrs === 'custom' ? customSourceCrs : sourceCrs

      // Detect format for this specific file
      const fileFormat = detectFormatFromFile(selectedFile.name) || inputFormat

      // Call native GDAL method to extract metadata with user-selected CRS
      const jsonString = Native.getVectorInfo(inputVector, fileFormat, finalSourceCrs)
      inputVector.delete()

      // Parse the JSON response
      const metadata = JSON.parse(jsonString)

      if (metadata.error) {
        throw new Error(metadata.error)
      }

      // Log debug information to console for troubleshooting
      console.log('=== Preview Data Debug Info ===')
      console.log('CRS:', metadata.crs)
      console.log('Debug CRS:', metadata.debugCrs)
      console.log('Debug Transform:', metadata.debugTransform)
      console.log('Bbox Reprojected:', metadata.bboxReprojected)
      console.log('Bbox Original:', metadata.bboxOriginal)
      console.log('Bbox (display):', metadata.bbox)

      // If native reprojection failed and we have original bbox, try proj4 fallback
      if (
        metadata.bboxReprojected === false &&
        metadata.bboxOriginal &&
        metadata.bboxOriginal.length === 4 &&
        metadata.crs &&
        metadata.crs !== 'Unknown'
      ) {
        try {
          console.log('Attempting proj4 fallback transformation...')
          const transformedBbox = await transformBboxWithProj4(
            metadata.bboxOriginal,
            metadata.crs
          )
          if (transformedBbox) {
            metadata.bbox = transformedBbox
            metadata.bboxReprojected = true
            metadata.debugTransform += ' [Fallback: proj4.js transformation successful]'
            console.log('✓ proj4 transformation successful:', transformedBbox)
          }
        } catch (projError) {
          console.warn('proj4 fallback failed:', projError.message)
          metadata.debugTransform += ` [Fallback: proj4.js failed - ${projError.message}]`
        }
      }

      console.log('===============================')

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
    if (!selectedFiles || selectedFiles.length === 0) return

    try {
      setIsConverting(true)

      let successCount = 0
      let failCount = 0
      const errors = []

      // Process each file
      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const selectedFile = selectedFiles[fileIndex]

        try {
          let inputArray
          let actualInputFormat = detectFormatFromFile(selectedFile.name) || inputFormat

          // Handle ZIP files for shapefiles
          if (selectedFile.name.endsWith('.zip') && actualInputFormat === 'shapefile') {
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
          const outputExt = FORMAT_LOOKUP[outputFormat]?.downloadExt || '.dat'

          // Trigger download
          const url = URL.createObjectURL(outputBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${baseName}${outputExt}`

          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          successCount++
        } catch (error) {
          failCount++
          const nativeError = typeof Native.getLastError === 'function' ? Native.getLastError() : ''
          console.error(`Conversion error for ${selectedFile.name}:`, error, nativeError ? `Native: ${nativeError}` : '')
          errors.push(`${selectedFile.name}: ${nativeError || error.message}`)
        }
      }

      // Helper function to make error messages more user-friendly
      const friendlyErrorMessage = (errorMsg) => {
        const lowerMsg = errorMsg.toLowerCase()
        const prefix = errorMsg.split(':')[0] || ''

        // Skip failures suggestion
        if (lowerMsg.includes('skipfailures') || lowerMsg.includes('skip failures') || lowerMsg.includes('terminating translation prematurely')) {
          return `${prefix}: Some features could not be converted. Try enabling "Skip Failures" in Advanced Options to skip problematic features and convert the rest.`
        }

        // File format not recognized
        if (lowerMsg.includes('not recognized as') || lowerMsg.includes('unable to open') || lowerMsg.includes('failed to identify')) {
          return `${prefix}: File format not recognized. Try selecting a different input format manually, or check if the file is corrupted.`
        }

        // CRS/Projection errors
        if (lowerMsg.includes('failed to reproject') || lowerMsg.includes('transformation failed') || lowerMsg.includes('unable to compute transformation')) {
          return `${prefix}: Coordinate transformation failed. Try specifying a custom Source CRS in Advanced Options if the file's projection isn't auto-detected correctly.`
        }

        // Geometry validation errors
        if (lowerMsg.includes('invalid geometry') || lowerMsg.includes('self-intersection') || lowerMsg.includes('topology error')) {
          return `${prefix}: Invalid geometry detected. Try enabling "Make Valid" in Advanced Options to automatically fix geometry errors.`
        }

        // SQL/WHERE clause errors
        if (lowerMsg.includes('sql') && (lowerMsg.includes('parse') || lowerMsg.includes('syntax'))) {
          return `${prefix}: Invalid WHERE clause syntax. Check your Attribute Filter in Advanced Options and use proper SQL syntax (e.g., field > 100 or field = 'value').`
        }

        // Field/attribute errors
        if (lowerMsg.includes('field') && (lowerMsg.includes('not found') || lowerMsg.includes('does not exist'))) {
          return `${prefix}: Field not found. Check your "Select Fields" or "Attribute Filter" in Advanced Options to ensure field names are correct.`
        }

        // Layer errors
        if (lowerMsg.includes('layer') && (lowerMsg.includes('not found') || lowerMsg.includes('does not exist'))) {
          return `${prefix}: Layer not found. Try removing the custom Layer Name in Advanced Options to use the default layer, or check the spelling.`
        }

        // Empty dataset
        if (lowerMsg.includes('no features') || lowerMsg.includes('empty') && lowerMsg.includes('layer')) {
          return `${prefix}: No features found. The file may be empty, or your filters (Geometry Type Filter, Attribute Filter) may be excluding all features.`
        }

        // Mixed geometry types (especially for Shapefiles)
        if (lowerMsg.includes('mixed geometry') || lowerMsg.includes('geometry type')) {
          return `${prefix}: Mixed geometry types detected. The conversion should handle this automatically, but you can also try filtering by specific geometry type in Advanced Options.`
        }

        // Z dimension issues
        if (lowerMsg.includes('z dimension') || lowerMsg.includes('3d') || lowerMsg.includes('elevation')) {
          return `${prefix}: Issue with 3D coordinates. Try toggling "Keep Z Dimension" in Advanced Options.`
        }

        return errorMsg
      }

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        setToast({
          isOpen: true,
          message: `Successfully converted ${successCount} file${successCount > 1 ? 's' : ''}!`,
          type: 'success'
        })
      } else if (successCount > 0 && failCount > 0) {
        setToast({
          isOpen: true,
          message: `Converted ${successCount} file${successCount > 1 ? 's' : ''}, ${failCount} failed. Check console for details.`,
          type: 'error'
        })
        console.error('Failed conversions:', errors)
      } else {
        const firstError = errors[0] || 'Unknown error'
        setToast({
          isOpen: true,
          message: friendlyErrorMessage(firstError),
          type: 'error'
        })
      }

    } catch (error) {
      console.error('Conversion error:', error)
      setToast({
        isOpen: true,
        message: `Conversion failed: ${error.message}`,
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

      <AppHeader
        gdalVersion={gdalVersion}
        isInitializing={isInitializing}
        onHelpClick={() => setShowHelp(true)}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 relative z-[1]">
        <div className="max-w-7xl mx-auto">
          <TitleSection />

          {/* 3 Column Layout */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Supported Formats */}
            <div className="lg:col-span-3">
              <SupportedFormats className="w-full" />
            </div>

            {/* Center - Main Converter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="order-first lg:order-none lg:col-span-6"
            >
              {/* Conversion Form */}
              <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6 space-y-8 shadow-2xl">
                {/* File Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-300">
                      Input Files
                    </label>
                    {selectedFiles.length === 0 ? (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-900/50 border border-zinc-800 rounded-lg opacity-50 cursor-not-allowed"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Preview</span>
                      </button>
                    ) : selectedFiles.length === 1 ? (
                      <button
                        type="button"
                        onClick={() => extractPreviewData(selectedFiles[0])}
                        disabled={isInitializing || resolvingSourceCrs || resolvingTargetCrs}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Preview</span>
                      </button>
                    ) : (
                      <Dropdown>
                        <DropdownButton
                          as="button"
                          disabled={isInitializing || resolvingSourceCrs || resolvingTargetCrs}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>Preview</span>
                          <ChevronDownIcon className="w-3 h-3" />
                        </DropdownButton>
                        <DropdownMenu className="max-h-64 overflow-y-auto z-[9999]">
                          {selectedFiles.map((file, index) => (
                            <DropdownItem key={index} onClick={() => extractPreviewData(file)}>
                              <DropdownLabel className="truncate max-w-xs">
                                {file.name}
                              </DropdownLabel>
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-select"
                      accept={INPUT_ACCEPT_ATTRIBUTE}
                      multiple
                    />
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="folder-select"
                      webkitdirectory=""
                      directory=""
                      multiple
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor="file-select"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-3 px-6 py-12',
                          'border-2 border-dashed rounded-xl cursor-pointer',
                          'transition-all duration-200',
                          isDragging && 'border-emerald-400 bg-emerald-500/10 scale-[1.02]',
                          !isDragging && selectedFiles.length > 0 && 'border-emerald-500/50 bg-emerald-500/5',
                          !isDragging && selectedFiles.length === 0 && 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30'
                        )}
                      >
                        <DocumentArrowUpIcon className={clsx(
                          'w-8 h-8',
                          isDragging ? 'text-emerald-400' : 'text-zinc-400'
                        )} />
                        <div className="text-center">
                          <p className={clsx(
                            'font-medium',
                            isDragging ? 'text-emerald-300' : 'text-zinc-300'
                          )}>
                            {isDragging
                              ? 'Drop files or folders here'
                              : selectedFiles.length > 0
                                ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                                : 'Drop files here or click to browse'}
                          </p>
                          <p className="text-sm text-zinc-500 mt-1">
                            {selectedFiles.length > 0
                              ? `Total: ${(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2)} KB`
                              : 'Multiple file selection supported'}
                          </p>
                        </div>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => document.getElementById('folder-select')?.click()}
                      className="mt-2 w-full px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
                    >
                      Or select a folder
                    </button>
                  </div>

                  {/* File List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <Text className="text-xs font-medium text-zinc-400">Selected Files</Text>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles([])}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-1 px-2 hover:bg-zinc-800/30 rounded text-xs"
                          >
                            <span className="text-zinc-300 truncate flex-1">{file.name}</span>
                            <span className="text-zinc-500 ml-2">{(file.size / 1024).toFixed(2)} KB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                        {READABLE_FORMATS.map((format) => {
                          const optionLabel = format.capabilities.write
                            ? format.label
                            : `${format.label} (input only)`
                          return (
                            <option key={format.value} value={format.value}>
                              {optionLabel}
                            </option>
                          )
                        })}
                      </Select>
                    </Field>

                    {/* Output Format */}
                    <Field>
                      <Label>Output Format</Label>
                      <Select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                      >
                        {WRITABLE_FORMATS.map((format) => {
                          const optionLabel = format.capabilities.read
                            ? format.label
                            : `${format.label} (output only)`
                          return (
                            <option key={format.value} value={format.value}>
                              {optionLabel}
                            </option>
                          )
                        })}
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
                  <div className="relative">
                    <Fieldset className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/50 space-y-6 backdrop-blur-sm max-h-[70vh] overflow-y-auto pr-2">
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
                            <Field>
                              <div className='flex justify-between items-center'>
                                <Label>Skip Failures</Label>
                                <Switch
                                  checked={skipFailures}
                                  onChange={setSkipFailures}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Skip invalid features instead of failing entire conversion
                              </Text>
                            </Field>

                            <Field >
                              <div className="flex items-center justify-between">
                                <Label>Make Valid</Label>
                                <Switch
                                  checked={makeValid}
                                  onChange={setMakeValid}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Auto-fix self-intersecting polygons and topology errors
                              </Text>
                            </Field>

                            <Field >
                              <div className="flex items-center justify-between">
                                <Label>Keep Z Dimension</Label>
                                <Switch
                                  checked={keepZ}
                                  onChange={setKeepZ}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Preserve 3D coordinates (default: 2D)
                              </Text>
                            </Field>

                            <Field >
                              <div className="flex items-center justify-between">
                                <Label>Explode Collections</Label>
                                <Switch
                                  checked={explodeCollections}
                                  onChange={setExplodeCollections}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Split GeometryCollections into simple features
                              </Text>
                            </Field>

                            <Field >
                              <div className="flex items-center justify-between">
                                <Label>Preserve FID</Label>
                                <Switch
                                  checked={preserveFid}
                                  onChange={setPreserveFid}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Keep original feature IDs (for stable references)
                              </Text>
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
                                    className="w-full accent-emerald-500"
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
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-zinc-800/70 to-transparent rounded-t-xl" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-zinc-800/70 to-transparent rounded-b-xl" />
                  </div>
                )}

                {/* Convert Button */}
                <Button
                  color="emerald"
                  onClick={handleConvert}
                  disabled={!selectedFiles || selectedFiles.length === 0 || isInitializing || isConverting}
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

            {/* Right Sidebar - Updates & Feedback */}
            <div className="lg:col-span-3 space-y-4">
              <ChangelogCard />
              <FeedbackForm className="w-full" />
            </div>
          </motion.div>

          <InfoFooter />
        </div>
      </main>

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        selectedFile={selectedFiles.length > 0 ? selectedFiles[0] : null}
        previewData={previewData}
        inputFormat={inputFormat}
        showBboxReprojectionFailure={showBboxReprojectionFailure}
      />

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
