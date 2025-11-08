import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { Select } from "@/components/select";
import { Input } from "@/components/input";
import { Field, Label, Fieldset, FieldGroup } from "@/components/fieldset";
import { Switch } from "@/components/switch";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
} from "@/components/dropdown";
import {
  ArrowPathIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { motion } from "motion/react";
import clsx from "clsx";
import JSZip from "jszip";
import proj4 from "proj4";
import { initCppJs, Native } from "@/native/native.h";
import { Text } from "@/components/text";
import {
  SupportedFormats,
  SUPPORTED_FORMATS,
} from "@/components/SupportedFormats";
import { ChangelogCard } from "@/components/ChangelogCard";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Toast } from "@/components/Toast";
import { HelpDialog } from "@/components/HelpDialog";
import "maplibre-gl/dist/maplibre-gl.css";
import { ParallaxStars } from "@/components/ParallaxStars";
import { TitleSection } from "@/components/TitleSection";
import { InfoFooter } from "@/components/InfoFooter";
import { PreviewModal } from "@/components/PreviewModal";
import { AppHeader } from "@/components/AppHeader";

// Common CRS options
const COMMON_CRS = [
  { value: "", label: "No transformation" },
  {
    value: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
    label: "WGS 84 (Lat/Lon)",
  },
  {
    value:
      "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs",
    label: "Web Mercator (Pseudo-Mercator)",
  },
  {
    value: "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs +type=crs",
    label: "WGS 84 / UTM Zone 33N",
  },
  {
    value:
      "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs +type=crs",
    label: "Lambert 93 (France)",
  },
  {
    value:
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs +type=crs",
    label: "British National Grid",
  },
  { value: "custom", label: "Custom PROJ string..." },
];

const EPSG_REGEX = /^epsg:(\d{1,6})$/i;
const PROJ_ENDPOINTS = [
  (code) => `https://spatialreference.org/ref/epsg/${code}/proj4.txt`,
  (code) => `https://epsg.io/${code}.proj4`,
];

// Geometry type filter options
const GEOMETRY_TYPE_FILTERS = [
  { value: "", label: "All geometry types" },
  { value: "Point", label: "Points only" },
  { value: "LineString", label: "Lines only" },
  { value: "Polygon", label: "Polygons only" },
  { value: "MultiPoint", label: "MultiPoints only" },
  { value: "MultiLineString", label: "MultiLines only" },
  { value: "MultiPolygon", label: "MultiPolygons only" },
];

const FORMAT_LOOKUP = SUPPORTED_FORMATS.reduce((acc, format) => {
  acc[format.value] = format;
  return acc;
}, {});

const READABLE_FORMATS = SUPPORTED_FORMATS.filter(
  (format) => format.capabilities.read,
);
const WRITABLE_FORMATS = SUPPORTED_FORMATS.filter(
  (format) => format.capabilities.write,
);

const DEFAULT_INPUT_FORMAT =
  READABLE_FORMATS.find((format) => format.value === "geojson")?.value ??
  READABLE_FORMATS[0]?.value ??
  "";

const DEFAULT_OUTPUT_FORMAT =
  WRITABLE_FORMATS.find((format) => format.value === "shapefile")?.value ??
  WRITABLE_FORMATS.find((format) => format.value === "geojson")?.value ??
  WRITABLE_FORMATS[0]?.value ??
  "";

const INPUT_ACCEPT_ATTRIBUTE = Array.from(
  new Set(
    READABLE_FORMATS.flatMap((format) =>
      Array.isArray(format.extensions) ? format.extensions : [],
    ),
  ),
)
  .map((ext) => {
    if (!ext) return null;
    const normalized = ext.startsWith(".") ? ext : `.${ext}`;
    return normalized.toLowerCase();
  })
  .filter(Boolean)
  .join(",");

function App() {
  const [gdalVersion, setGdalVersion] = useState("Initializing...");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [inputFormat, setInputFormat] = useState(DEFAULT_INPUT_FORMAT);
  const [outputFormat, setOutputFormat] = useState(DEFAULT_OUTPUT_FORMAT);
  const [formatAutoDetected, setFormatAutoDetected] = useState(false);
  const [sourceCrs, setSourceCrs] = useState("");
  const [targetCrs, setTargetCrs] = useState("");
  const [customSourceCrs, setCustomSourceCrs] = useState("");
  const [customTargetCrs, setCustomTargetCrs] = useState("");
  const [layerName, setLayerName] = useState("");
  const [geometryTypeFilter, setGeometryTypeFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // New advanced options
  const [skipFailures, setSkipFailures] = useState(false);
  const [makeValid, setMakeValid] = useState(false);
  const [keepZ, setKeepZ] = useState(false);
  const [whereClause, setWhereClause] = useState("");
  const [selectFields, setSelectFields] = useState("");
  const [simplifyTolerance, setSimplifyTolerance] = useState(0);
  const [explodeCollections, setExplodeCollections] = useState(true); // Default ON
  const [preserveFid, setPreserveFid] = useState(false);

  // Format-specific options
  const [geojsonPrecision, setGeojsonPrecision] = useState(7);
  const [csvGeometryMode, setCsvGeometryMode] = useState("WKT"); // WKT or XY

  // Toast state
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  // Cached CRS lookups
  const projLookupCache = useRef({});
  const [resolvingSourceCrs, setResolvingSourceCrs] = useState(false);
  const [resolvingTargetCrs, setResolvingTargetCrs] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Preview cache - cache preview data by file name, size, and lastModified
  const previewCache = useRef({});

  // Help dialog state
  const [showHelp, setShowHelp] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Initialize Web Worker for off-thread processing
  const converterWorkerRef = useRef(null);

  // No need for complex control flow - we'll always try to reproject bbox if possible

  useEffect(() => {
    // Initialize WASM module for main thread (for getGdalInfo)
    initCppJs().then(() => {
      setGdalVersion(Native.getGdalInfo());
      setIsInitializing(false);
    });

    // Initialize Web Worker
    converterWorkerRef.current = new Worker(
      new URL('./workers/converter.worker.js', import.meta.url)
    );

    // Cleanup worker on unmount
    return () => {
      if (converterWorkerRef.current) {
        converterWorkerRef.current.terminate();
      }
    };
  }, []);

  const detectFormatFromFile = (filename) => {
    if (!filename) return null;

    const lowerName = filename.toLowerCase();
    let matchedFormat = null;
    let longestMatch = 0;

    for (const format of SUPPORTED_FORMATS) {
      if (!Array.isArray(format.extensions)) continue;
      for (const rawExtension of format.extensions) {
        if (!rawExtension) continue;
        const normalized = rawExtension.startsWith(".")
          ? rawExtension.toLowerCase()
          : `.${rawExtension.toLowerCase()}`;

        if (
          lowerName.endsWith(normalized) &&
          normalized.length > longestMatch
        ) {
          matchedFormat = format.value;
          longestMatch = normalized.length;
        }
      }
    }

    return matchedFormat;
  };

  const isFileSupported = (filename) => {
    return detectFormatFromFile(filename) !== null;
  };

  // Helper to extract base name without extension for shapefile grouping
  const getShapefileBaseName = (filename) => {
    const lowerName = filename.toLowerCase();
    const shapefileExts = ['.shp', '.shx', '.dbf', '.prj', '.cpg', '.sbn', '.sbx', '.fbn', '.fbx', '.ain', '.aih', '.ixs', '.mxs', '.atx', '.shp.xml', '.qix'];

    for (const ext of shapefileExts) {
      if (lowerName.endsWith(ext)) {
        return filename.substring(0, filename.length - ext.length);
      }
    }
    return null;
  };

  // Helper to extract base name for MapInfo TAB files
  const getMapInfoTabBaseName = (filename) => {
    const lowerName = filename.toLowerCase();
    const mapinfoExts = ['.tab', '.dat', '.map', '.id', '.ind'];

    for (const ext of mapinfoExts) {
      if (lowerName.endsWith(ext)) {
        return filename.substring(0, filename.length - ext.length);
      }
    }
    return null;
  };

  // Helper to extract base name for MapInfo MIF/MID files
  const getMapInfoMifBaseName = (filename) => {
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.mif')) {
      return filename.substring(0, filename.length - 4);
    }
    if (lowerName.endsWith('.mid')) {
      return filename.substring(0, filename.length - 4);
    }
    return null;
  };

  // Group shapefile components by base name
  const groupShapefileComponents = (files) => {
    const shapefileGroups = new Map();
    const otherFiles = [];

    files.forEach(file => {
      const baseName = getShapefileBaseName(file.name);
      if (baseName && detectFormatFromFile(file.name) === 'shapefile') {
        if (!shapefileGroups.has(baseName)) {
          shapefileGroups.set(baseName, []);
        }
        shapefileGroups.get(baseName).push(file);
      } else {
        otherFiles.push(file);
      }
    });

    return { shapefileGroups, otherFiles };
  };

  // Group all multi-file formats (shapefiles, MapInfo TAB, MapInfo MIF/MID)
  const groupMultiFileFormats = (files) => {
    const shapefileGroups = new Map();
    const mapinfoTabGroups = new Map();
    const mapinfoMifGroups = new Map();
    const otherFiles = [];

    files.forEach(file => {
      const format = detectFormatFromFile(file.name);

      // Try shapefile
      const shpBaseName = getShapefileBaseName(file.name);
      if (shpBaseName && format === 'shapefile') {
        if (!shapefileGroups.has(shpBaseName)) {
          shapefileGroups.set(shpBaseName, []);
        }
        shapefileGroups.get(shpBaseName).push(file);
        return;
      }

      // Try MapInfo TAB
      const tabBaseName = getMapInfoTabBaseName(file.name);
      if (tabBaseName && format === 'mapinfo') {
        if (!mapinfoTabGroups.has(tabBaseName)) {
          mapinfoTabGroups.set(tabBaseName, []);
        }
        mapinfoTabGroups.get(tabBaseName).push(file);
        return;
      }

      // Try MapInfo MIF/MID
      const mifBaseName = getMapInfoMifBaseName(file.name);
      if (mifBaseName && format === 'mapinfomif') {
        if (!mapinfoMifGroups.has(mifBaseName)) {
          mapinfoMifGroups.set(mifBaseName, []);
        }
        mapinfoMifGroups.get(mifBaseName).push(file);
        return;
      }

      // Not a multi-file format component
      otherFiles.push(file);
    });

    return { shapefileGroups, mapinfoTabGroups, mapinfoMifGroups, otherFiles };
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = (files) => {
    if (!files || files.length === 0) return;

    // Validate files and separate supported from unsupported
    const supportedFiles = [];
    const unsupportedFiles = [];
    const largeFiles = [];
    const veryLargeFiles = [];

    // File size thresholds (in bytes)
    const WARNING_SIZE = 50 * 1024 * 1024; // 50 MB
    const DANGER_SIZE = 100 * 1024 * 1024; // 100 MB
    const CRITICAL_SIZE = 150 * 1024 * 1024; // 150 MB

    files.forEach((file) => {
      if (isFileSupported(file.name)) {
        supportedFiles.push(file);

        // Check file size for warnings
        if (file.size >= CRITICAL_SIZE) {
          veryLargeFiles.push({ name: file.name, size: file.size });
        } else if (file.size >= WARNING_SIZE) {
          largeFiles.push({ name: file.name, size: file.size });
        }
      } else {
        unsupportedFiles.push(file.name);
      }
    });

    // Show error for unsupported files
    if (unsupportedFiles.length > 0) {
      const fileList = unsupportedFiles.slice(0, 5).join(", ");
      const extra =
        unsupportedFiles.length > 5
          ? ` and ${unsupportedFiles.length - 5} more`
          : "";
      setToast({
        isOpen: true,
        message: `Unsupported file format${unsupportedFiles.length > 1 ? "s" : ""}: ${fileList}${extra}`,
        type: "error",
      });
    }

    // If no supported files, return early
    if (supportedFiles.length === 0) {
      return;
    }

    // Show warnings for large files
    if (veryLargeFiles.length > 0) {
      const fileInfo = veryLargeFiles.map(f =>
        `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`
      ).join(", ");

      setToast({
        isOpen: true,
        message: `⚠️ Very large file detected: ${fileInfo}. Files over 100 MB may fail due to browser memory limits (2 GB). Consider: 1) Splitting the file into smaller parts, 2) Using "Attribute Filter" to process subsets, 3) Enabling "Simplify" to reduce geometry complexity.`,
        type: "warning",
      });
    } else if (largeFiles.length > 0) {
      const fileInfo = largeFiles.map(f =>
        `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`
      ).join(", ");

      setToast({
        isOpen: true,
        message: `⚠️ Large file detected: ${fileInfo}. May require significant memory. If conversion fails, try using Advanced Options to filter or simplify the data.`,
        type: "warning",
      });
    }

    setSelectedFiles(supportedFiles);
    setPreviewData(null); // Reset preview data

    // Clear preview cache when new files are selected to prevent memory buildup
    previewCache.current = {};

    // Auto-detect input format from first file's extension
    const firstFile = supportedFiles[0];
    const detectedFormat = detectFormatFromFile(firstFile.name);
    const nextInputFormat = detectedFormat ?? DEFAULT_INPUT_FORMAT;

    setInputFormat(nextInputFormat);
    setFormatAutoDetected(Boolean(detectedFormat));

    const geojsonAvailable = WRITABLE_FORMATS.some(
      (format) => format.value === "geojson",
    );
    const shapefileAvailable = WRITABLE_FORMATS.some(
      (format) => format.value === "shapefile",
    );

    if (detectedFormat === "shapefile" && geojsonAvailable) {
      setOutputFormat("geojson");
    } else if (detectedFormat === "geojson" && shapefileAvailable) {
      setOutputFormat("shapefile");
    } else if (
      !WRITABLE_FORMATS.some((format) => format.value === outputFormat)
    ) {
      setOutputFormat(DEFAULT_OUTPUT_FORMAT);
    } else if (
      detectedFormat &&
      !FORMAT_LOOKUP[detectedFormat]?.capabilities.write
    ) {
      setOutputFormat(DEFAULT_OUTPUT_FORMAT);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer?.items;
    if (!items) {
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        processFiles(files);
      }
      return;
    }

    // Handle folders and multiple files
    const allFiles = [];
    const entries = Array.from(items).map((item) => item.webkitGetAsEntry());

    const readEntry = async (entry) => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => resolve(file));
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
          const files = [];
          const readEntries = () => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve(files);
              } else {
                for (const entry of entries) {
                  const result = await readEntry(entry);
                  if (Array.isArray(result)) {
                    files.push(...result);
                  } else if (result) {
                    files.push(result);
                  }
                }
                readEntries();
              }
            });
          };
          readEntries();
        });
      }
    };

    for (const entry of entries) {
      if (entry) {
        const result = await readEntry(entry);
        if (Array.isArray(result)) {
          allFiles.push(...result);
        } else if (result) {
          allFiles.push(result);
        }
      }
    }

    if (allFiles.length > 0) {
      processFiles(allFiles);
    }
  };

  /**
   * Transform a bounding box to WGS84 using proj4.js as fallback
   * when native PROJ transformation fails
   */
  const transformBboxWithProj4 = async (bbox, sourceCrs) => {
    if (!bbox || bbox.length !== 4) {
      throw new Error("Invalid bbox format");
    }

    // Parse CRS - extract EPSG code or use as PROJ string
    let proj4Def = null;
    const epsgMatch = sourceCrs.match(/EPSG:(\d+)/i);

    if (epsgMatch) {
      const epsgCode = epsgMatch[1];
      // Try to get PROJ4 definition from epsg.io
      try {
        const response = await fetch(`https://epsg.io/${epsgCode}.proj4`, {
          mode: "cors",
        });
        if (response.ok) {
          proj4Def = await response.text();
          console.log(
            `Fetched PROJ4 definition for EPSG:${epsgCode}:`,
            proj4Def,
          );
        }
      } catch (error) {
        console.warn(
          `Failed to fetch PROJ4 definition for EPSG:${epsgCode}`,
          error,
        );
      }

      // Fallback: use EPSG code directly (proj4 has some built-in definitions)
      if (!proj4Def) {
        proj4Def = `EPSG:${epsgCode}`;
      }
    } else {
      // Assume sourceCrs is already a PROJ string
      proj4Def = sourceCrs;
    }

    // Define WGS84
    const wgs84 = "EPSG:4326";

    // Sample 8 points along each edge (same as native code)
    const [minX, minY, maxX, maxY] = bbox;
    const points = [];
    const steps = 8;

    // Helper to add edge points
    const addEdge = (x0, y0, x1, y1) => {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    };

    // Sample edges (bottom, right, top, left)
    addEdge(minX, minY, maxX, minY);
    addEdge(maxX, minY, maxX, maxY);
    addEdge(maxX, maxY, minX, maxY);
    addEdge(minX, maxY, minX, minY);

    // Transform all points
    const transformer = proj4(proj4Def, wgs84);
    const transformedPoints = points.map(([x, y]) => {
      const result = transformer.forward([x, y]);
      return result;
    });

    // Find min/max of transformed points
    const xs = transformedPoints.map((p) => p[0]);
    const ys = transformedPoints.map((p) => p[1]);

    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };

  const extractPreviewData = async (fileToPreview = null) => {
    if (!selectedFiles || selectedFiles.length === 0 || isInitializing) return;

    try {
      setIsLoadingPreview(true);

      // Use specified file or default to first file
      const selectedFile = fileToPreview || selectedFiles[0];

      // Get final source CRS (use custom if 'custom' is selected)
      const finalSourceCrs =
        sourceCrs === "custom" ? customSourceCrs : sourceCrs;

      // Detect format for this specific file
      let fileFormat = detectFormatFromFile(selectedFile.name) || inputFormat;

      // Check if this is a shapefile component that needs bundling
      let arrayBuffer;
      let displayName = selectedFile.name;
      let cacheKey;

      // Check if this is a multi-file format that needs bundling
      const shpBaseName = getShapefileBaseName(selectedFile.name);
      const tabBaseName = getMapInfoTabBaseName(selectedFile.name);
      const mifBaseName = getMapInfoMifBaseName(selectedFile.name);

      if (shpBaseName && fileFormat === 'shapefile' && !selectedFile.name.toLowerCase().endsWith('.zip')) {
        // This is a raw shapefile component - group with related files
        const { shapefileGroups } = groupMultiFileFormats(selectedFiles);
        const relatedFiles = shapefileGroups.get(shpBaseName);

        if (relatedFiles && relatedFiles.length > 1) {
          // Bundle into ZIP for preview
          const zip = new JSZip();
          for (const file of relatedFiles) {
            const fileBuffer = await file.arrayBuffer();
            zip.file(file.name, fileBuffer);
          }
          arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
          displayName = shpBaseName + '.shp';

          // Create cache key based on all related files
          const allFileInfo = relatedFiles.map(f => `${f.name}_${f.size}_${f.lastModified}`).sort().join('|');
          cacheKey = `${allFileInfo}_${fileFormat}_${finalSourceCrs || 'auto'}`;
        } else {
          // Single file, process normally
          arrayBuffer = await selectedFile.arrayBuffer();
          cacheKey = `${selectedFile.name}_${selectedFile.size}_${selectedFile.lastModified}_${fileFormat}_${finalSourceCrs || 'auto'}`;
        }
      } else if (tabBaseName && fileFormat === 'mapinfo' && !selectedFile.name.toLowerCase().endsWith('.zip')) {
        // This is a raw MapInfo TAB component - group with related files
        const { mapinfoTabGroups } = groupMultiFileFormats(selectedFiles);
        const relatedFiles = mapinfoTabGroups.get(tabBaseName);

        if (relatedFiles && relatedFiles.length > 1) {
          // Bundle into ZIP for preview
          const zip = new JSZip();
          for (const file of relatedFiles) {
            const fileBuffer = await file.arrayBuffer();
            zip.file(file.name, fileBuffer);
          }
          arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
          displayName = tabBaseName + '.tab';

          // Create cache key based on all related files
          const allFileInfo = relatedFiles.map(f => `${f.name}_${f.size}_${f.lastModified}`).sort().join('|');
          cacheKey = `${allFileInfo}_${fileFormat}_${finalSourceCrs || 'auto'}`;
        } else {
          // Single file, process normally
          arrayBuffer = await selectedFile.arrayBuffer();
          cacheKey = `${selectedFile.name}_${selectedFile.size}_${selectedFile.lastModified}_${fileFormat}_${finalSourceCrs || 'auto'}`;
        }
      } else if (mifBaseName && fileFormat === 'mapinfomif') {
        // This is a MapInfo MIF/MID component - group with related files
        const { mapinfoMifGroups } = groupMultiFileFormats(selectedFiles);
        const relatedFiles = mapinfoMifGroups.get(mifBaseName);

        if (relatedFiles && relatedFiles.length > 1) {
          // Bundle into ZIP for preview (for consistency)
          const zip = new JSZip();
          for (const file of relatedFiles) {
            const fileBuffer = await file.arrayBuffer();
            zip.file(file.name, fileBuffer);
          }
          arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
          displayName = mifBaseName + '.mif';

          // Create cache key based on all related files
          const allFileInfo = relatedFiles.map(f => `${f.name}_${f.size}_${f.lastModified}`).sort().join('|');
          cacheKey = `${allFileInfo}_${fileFormat}_${finalSourceCrs || 'auto'}`;
        } else {
          // Single file, process normally
          arrayBuffer = await selectedFile.arrayBuffer();
          cacheKey = `${selectedFile.name}_${selectedFile.size}_${selectedFile.lastModified}_${fileFormat}_${finalSourceCrs || 'auto'}`;
        }
      } else {
        // Not a multi-file format component or already a ZIP
        arrayBuffer = await selectedFile.arrayBuffer();
        cacheKey = `${selectedFile.name}_${selectedFile.size}_${selectedFile.lastModified}_${fileFormat}_${finalSourceCrs || 'auto'}`;
      }

      // Check if we have cached preview data
      if (previewCache.current[cacheKey]) {
        console.log('✓ Using cached preview data for:', displayName);
        setPreviewData(previewCache.current[cacheKey]);
        setShowPreview(true);
        setIsLoadingPreview(false);

        // Show toast to inform user that cached data is being used
        setToast({
          isOpen: true,
          message: `✓ Preview loaded instantly from cache`,
          type: "success",
        });

        return;
      }

      console.log('⟳ Loading preview data for:', displayName);

      // Call worker to extract metadata (off main thread)
      let jsonString = await getVectorInfoWithWorker(
        arrayBuffer,
        displayName,
        fileFormat,
        finalSourceCrs,
      );

      // Parse JSON with fallback sanitization for control characters
      let metadata;
      try {
        // First attempt: try parsing as-is
        metadata = JSON.parse(jsonString);
      } catch (parseError) {
        // If parsing fails, try to sanitize the JSON string
        console.warn(
          "Initial JSON parse failed, attempting to sanitize:",
          parseError.message,
        );

        // Sanitize by removing or escaping control characters in string values
        // This regex finds string values and replaces control characters within them
        jsonString = jsonString.replace(
          /"([^"\\]*(\\.[^"\\]*)*)"/g,
          (match) => {
            // For each string, replace control characters
            return match.replace(/[\x00-\x1F\x7F]/g, (char) => {
              // Keep allowed control chars that are already escaped
              const code = char.charCodeAt(0);
              switch (code) {
                case 0x08:
                  return "\\b";
                case 0x09:
                  return "\\t";
                case 0x0a:
                  return "\\n";
                case 0x0c:
                  return "\\f";
                case 0x0d:
                  return "\\r";
                default:
                  return ""; // Remove other control characters
              }
            });
          },
        );

        // Try parsing again after sanitization
        metadata = JSON.parse(jsonString);
      }

      if (metadata.error) {
        throw new Error(metadata.error);
      }

      // Use user-specified source CRS if provided, otherwise use auto-detected CRS
      const crsForReprojection = finalSourceCrs || metadata.crs;

      // Check if CRS is already in geographic coordinates (lat/lon)
      const isAlreadyGeographic =
        !crsForReprojection ||
        crsForReprojection === "Unknown" ||
        crsForReprojection === "EPSG:4326" ||
        crsForReprojection.includes("+proj=longlat") ||
        crsForReprojection.includes("+proj=latlong");

      // Always try to reproject bbox to WGS84 for map display using proj4
      // Only skip if already in geographic coordinates or missing data
      if (metadata.bbox && metadata.bbox.length === 4 && !isAlreadyGeographic) {
        try {
          // Store original bbox before transformation
          metadata.bboxOriginal = [...metadata.bbox];
          const transformedBbox = await transformBboxWithProj4(
            metadata.bbox,
            crsForReprojection,
          );
          metadata.bbox = transformedBbox;
          metadata.bboxReprojected = true;
          metadata.crsUsedForReprojection = crsForReprojection;
          console.log(
            `✓ Bbox reprojected to WGS84 using ${finalSourceCrs ? "user-specified" : "auto-detected"} CRS:`,
            crsForReprojection,
          );
        } catch (projError) {
          console.warn(
            "Bbox reprojection failed, using original coordinates:",
            projError.message,
          );
          // Keep original bbox as fallback
          metadata.bboxReprojected = false;
        }
      }

      // Log debug info
      console.log("=== Preview Data ===");
      console.log("CRS:", metadata.crs);
      console.log("Bbox:", metadata.bbox);
      console.log("Feature Count:", metadata.featureCount);
      console.log("Layers:", metadata.layers);

      // Cache the preview data
      previewCache.current[cacheKey] = metadata;
      console.log('✓ Preview data cached for:', selectedFile.name);

      setPreviewData(metadata);
      setShowPreview(true);
    } catch (error) {
      console.error("Error extracting preview data:", error);
      setToast({
        isOpen: true,
        message: "Failed to extract preview data. " + error.message,
        type: "error",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const resolveEpsgCode = async (rawValue, scope) => {
    if (!rawValue) return;
    const match = rawValue.trim().match(EPSG_REGEX);
    if (!match) return;

    const code = match[1];
    const cacheKey = code;
    const isSource = scope === "source";
    const currentlyResolving = isSource
      ? resolvingSourceCrs
      : resolvingTargetCrs;
    if (currentlyResolving) return;

    const setValue = isSource ? setCustomSourceCrs : setCustomTargetCrs;
    const setResolving = isSource
      ? setResolvingSourceCrs
      : setResolvingTargetCrs;

    setResolving(true);

    try {
      let projString = projLookupCache.current[cacheKey];
      const fromCache = Boolean(projString);

      if (!projString) {
        let lastError = null;

        for (const buildUrl of PROJ_ENDPOINTS) {
          const url = buildUrl(code);
          try {
            const response = await fetch(url, { mode: "cors" });
            if (!response.ok) {
              lastError = new Error(`HTTP ${response.status}`);
              continue;
            }
            const text = (await response.text()).trim();
            if (!text || !text.startsWith("+proj")) {
              lastError = new Error("Unexpected response format");
              continue;
            }
            projString = text;
            break;
          } catch (error) {
            lastError =
              error instanceof Error ? error : new Error(String(error));
          }
        }

        if (!projString) {
          throw lastError || new Error("Unable to fetch PROJ definition");
        }

        projLookupCache.current[cacheKey] = projString;
      }

      setValue(projString);

      if (!fromCache) {
        setToast({
          isOpen: true,
          message: `Resolved EPSG:${code} to PROJ string.`,
          type: "success",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setToast({
        isOpen: true,
        message: `Failed to resolve EPSG:${code}. ${errorMessage}`,
        type: "error",
      });
    } finally {
      setResolving(false);
    }
  };

  const handleSourceCustomBlur = () => {
    resolveEpsgCode(customSourceCrs, "source");
  };

  const handleTargetCustomBlur = () => {
    resolveEpsgCode(customTargetCrs, "target");
  };

  // Helper function to convert file using Web Worker
  const convertFileWithWorker = (fileData, fileName, inputFormat, outputFormat, options) => {
    return new Promise((resolve, reject) => {
      const worker = converterWorkerRef.current;

      if (!worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      // Set up one-time message handler for this conversion
      const handleMessage = (e) => {
        worker.removeEventListener('message', handleMessage);

        if (e.data.success) {
          resolve(new Uint8Array(e.data.data));
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handleMessage);

      // Send conversion request to worker
      worker.postMessage({
        type: 'convert',
        fileData,
        fileName,
        inputFormat,
        outputFormat,
        options
      }, [fileData]); // Transfer ArrayBuffer ownership to worker
    });
  };

  // Helper function to get vector info using Web Worker
  const getVectorInfoWithWorker = (fileData, fileName, inputFormat, sourceCrs) => {
    return new Promise((resolve, reject) => {
      const worker = converterWorkerRef.current;

      if (!worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      // Set up one-time message handler for this request
      const handleMessage = (e) => {
        worker.removeEventListener('message', handleMessage);

        if (e.data.success) {
          resolve(e.data.info);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handleMessage);

      // Send getVectorInfo request to worker
      worker.postMessage({
        type: 'getVectorInfo',
        fileData,
        fileName,
        inputFormat,
        options: {
          sourceCrs
        }
      }, [fileData]); // Transfer ArrayBuffer ownership to worker
    });
  };

  const handleConvert = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setIsConverting(true);

      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const successFiles = [];

      // Group multi-file formats together
      const { shapefileGroups, mapinfoTabGroups, mapinfoMifGroups, otherFiles } = groupMultiFileFormats(selectedFiles);

      // Create a list of processable items (either single files or grouped multi-file formats)
      const processableItems = [];

      // Add grouped shapefiles
      for (const [baseName, files] of shapefileGroups.entries()) {
        // Check if we have a .shp file (required)
        const hasShp = files.some(f => f.name.toLowerCase().endsWith('.shp'));
        if (hasShp) {
          processableItems.push({
            type: 'shapefile-group',
            baseName,
            files,
            displayName: baseName + '.shp',
            format: 'shapefile'
          });
        } else {
          // Missing .shp file - treat individually
          files.forEach(f => processableItems.push({
            type: 'single',
            file: f,
            displayName: f.name
          }));
        }
      }

      // Add grouped MapInfo TAB files
      for (const [baseName, files] of mapinfoTabGroups.entries()) {
        // Check if we have a .tab file (required)
        const hasTab = files.some(f => f.name.toLowerCase().endsWith('.tab'));
        if (hasTab) {
          processableItems.push({
            type: 'mapinfo-tab-group',
            baseName,
            files,
            displayName: baseName + '.tab',
            format: 'mapinfo'
          });
        } else {
          // Missing .tab file - treat individually
          files.forEach(f => processableItems.push({
            type: 'single',
            file: f,
            displayName: f.name
          }));
        }
      }

      // Add grouped MapInfo MIF/MID files
      for (const [baseName, files] of mapinfoMifGroups.entries()) {
        // Check if we have a .mif file (required)
        const hasMif = files.some(f => f.name.toLowerCase().endsWith('.mif'));
        if (hasMif) {
          processableItems.push({
            type: 'mapinfo-mif-group',
            baseName,
            files,
            displayName: baseName + '.mif',
            format: 'mapinfomif'
          });
        } else {
          // Missing .mif file - treat individually
          files.forEach(f => processableItems.push({
            type: 'single',
            file: f,
            displayName: f.name
          }));
        }
      }

      // Add other files
      otherFiles.forEach(f => processableItems.push({
        type: 'single',
        file: f,
        displayName: f.name
      }));

      // Process each item
      for (let itemIndex = 0; itemIndex < processableItems.length; itemIndex++) {
        const item = processableItems[itemIndex];

        try {
          let inputArray;
          let actualInputFormat;
          let displayName = item.displayName;

          if (item.type === 'shapefile-group') {
            // Bundle shapefile components into a ZIP
            const zip = new JSZip();

            for (const file of item.files) {
              const arrayBuffer = await file.arrayBuffer();
              zip.file(file.name, arrayBuffer);
            }

            const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });
            inputArray = new Uint8Array(zipBlob);
            actualInputFormat = 'shapefile';
          } else if (item.type === 'mapinfo-tab-group') {
            // Bundle MapInfo TAB components into a ZIP
            const zip = new JSZip();

            for (const file of item.files) {
              const arrayBuffer = await file.arrayBuffer();
              zip.file(file.name, arrayBuffer);
            }

            const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });
            inputArray = new Uint8Array(zipBlob);
            actualInputFormat = 'mapinfo';
          } else if (item.type === 'mapinfo-mif-group') {
            // Bundle MapInfo MIF/MID components into a ZIP (for consistency)
            const zip = new JSZip();

            for (const file of item.files) {
              const arrayBuffer = await file.arrayBuffer();
              zip.file(file.name, arrayBuffer);
            }

            const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });
            inputArray = new Uint8Array(zipBlob);
            actualInputFormat = 'mapinfomif';
          } else {
            const selectedFile = item.file;
            actualInputFormat = detectFormatFromFile(selectedFile.name) || inputFormat;

            // Handle ZIP files for shapefiles
            if (
              selectedFile.name.endsWith(".zip") &&
              actualInputFormat === "shapefile"
            ) {
              // Extract the shapefile from ZIP
              const arrayBuffer = await selectedFile.arrayBuffer();
              const zip = await JSZip.loadAsync(arrayBuffer);

              // Find the .shp file in the ZIP
              const shpFile = Object.keys(zip.files).find((name) =>
                name.endsWith(".shp"),
              );
              if (!shpFile) {
                throw new Error("No .shp file found in the ZIP archive");
              }

              // For now, we need to pass the whole ZIP to GDAL
              // GDAL can read from /vsizip/ paths
              inputArray = new Uint8Array(arrayBuffer);
            } else {
              // Read the file as ArrayBuffer
              const arrayBuffer = await selectedFile.arrayBuffer();
              inputArray = new Uint8Array(arrayBuffer);
            }
          }

          // Get final CRS values (use custom if 'custom' is selected)
          const finalSourceCrs =
            sourceCrs === "custom" ? customSourceCrs : sourceCrs;
          const finalTargetCrs =
            targetCrs === "custom" ? customTargetCrs : targetCrs;

          // Convert using Web Worker (off main thread)
          const outputArray = await convertFileWithWorker(
            inputArray.buffer,
            displayName,
            actualInputFormat,
            outputFormat,
            {
              sourceCrs: finalSourceCrs,
              targetCrs: finalTargetCrs,
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
              csvGeometryMode,
            }
          );

          // Create blob for download
          const baseName = displayName.replace(/\.[^/.]+$/, "");
          const outputBlob = new Blob([outputArray], {
            type: "application/octet-stream",
          });
          const outputExt = FORMAT_LOOKUP[outputFormat]?.downloadExt || ".dat";

          // Trigger download
          const url = URL.createObjectURL(outputBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${baseName}${outputExt}`;

          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          successCount++;
          successFiles.push(displayName);
        } catch (error) {
          failCount++;
          console.error(
            `Conversion error for ${displayName}:`,
            error,
          );
          errors.push(`${displayName}: ${error.message}`);
        }
      }

      // Generate report.txt with conversion results
      if (selectedFiles.length > 0) {
        let reportContent = "=== GEOCONVERTER CONVERSION REPORT ===\n\n";
        reportContent += `Date: ${new Date().toLocaleString()}\n`;
        reportContent += `Total Files: ${selectedFiles.length}\n`;
        reportContent += `Successful: ${successCount}\n`;
        reportContent += `Failed: ${failCount}\n`;
        reportContent += `\n${"=".repeat(50)}\n\n`;

        // List successful files
        if (successFiles.length > 0) {
          reportContent += "✓ SUCCEEDED:\n\n";
          successFiles.forEach((filename) => {
            reportContent += `  ✓ ${filename}\n`;
          });
          reportContent += "\n";
        }

        // List failed files with errors
        if (errors.length > 0) {
          reportContent += "✗ FAILED:\n\n";
          errors.forEach((error) => {
            reportContent += `  ✗ ${error}\n`;
          });
          reportContent += "\n";
        }

        reportContent += `${"=".repeat(50)}\n`;
        reportContent += "\nGenerated by GeoConverter\n";

        // Create and download report.txt
        const reportBlob = new Blob([reportContent], { type: "text/plain" });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportLink = document.createElement("a");
        reportLink.href = reportUrl;
        reportLink.download = "report.txt";

        // Add a small delay before downloading the report to ensure other downloads complete
        setTimeout(() => {
          document.body.appendChild(reportLink);
          reportLink.click();
          document.body.removeChild(reportLink);
          URL.revokeObjectURL(reportUrl);
        }, 200);
      }

      // Helper function to make error messages more user-friendly
      const friendlyErrorMessage = (errorMsg) => {
        const lowerMsg = errorMsg.toLowerCase();
        const prefix = errorMsg.split(":")[0] || "";

        // Memory/WASM errors - HIGHEST PRIORITY
        if (
          lowerMsg.includes("cannot enlarge memory") ||
          lowerMsg.includes("memory limit") ||
          lowerMsg.includes("out of memory") ||
          lowerMsg.includes("failed to allocate") ||
          lowerMsg.includes("requested") && lowerMsg.includes("bytes") && lowerMsg.includes("limit")
        ) {
          return `${prefix}: ❌ Browser memory limit exceeded (2 GB WebAssembly limit). Your file is too large to process in the browser. Solutions: 1️⃣ Split the file into smaller parts using desktop GIS software (QGIS/ArcGIS), 2️⃣ Use "Attribute Filter" (WHERE clause) to process data in chunks (e.g., "FID < 10000", then "FID >= 10000 AND FID < 20000"), 3️⃣ Enable "Simplify Tolerance" (try 0.001-0.01) to reduce geometry complexity, 4️⃣ Use "Select Fields" to include only essential attributes, 5️⃣ Disable "Keep Z Dimension" to save 33% memory. For very large datasets, consider using desktop GDAL/ogr2ogr instead.`;
        }

        // PROJ/SQLite errors (often follows memory errors)
        if (
          lowerMsg.includes("proj:") ||
          lowerMsg.includes("sqlite error") ||
          lowerMsg.includes("no such table: metadata")
        ) {
          return `${prefix}: ⚠️ Coordinate system database error. This often occurs after a memory failure. Try reducing file size or processing in smaller chunks using "Attribute Filter" in Advanced Options.`;
        }

        // Skip failures suggestion
        if (
          lowerMsg.includes("skipfailures") ||
          lowerMsg.includes("skip failures") ||
          lowerMsg.includes("terminating translation prematurely")
        ) {
          return `${prefix}: Some features could not be converted. Try enabling "Skip Failures" in Advanced Options to skip problematic features and convert the rest.`;
        }

        // File format not recognized
        if (
          lowerMsg.includes("not recognized as") ||
          lowerMsg.includes("unable to open") ||
          lowerMsg.includes("failed to identify")
        ) {
          return `${prefix}: File format not recognized. Try selecting a different input format manually, or check if the file is corrupted.`;
        }

        // CRS/Projection errors
        if (
          lowerMsg.includes("failed to reproject") ||
          lowerMsg.includes("transformation failed") ||
          lowerMsg.includes("unable to compute transformation")
        ) {
          return `${prefix}: Coordinate transformation failed. Try specifying a custom Source CRS in Advanced Options if the file's projection isn't auto-detected correctly.`;
        }

        // Geometry validation errors
        if (
          lowerMsg.includes("invalid geometry") ||
          lowerMsg.includes("self-intersection") ||
          lowerMsg.includes("topology error")
        ) {
          return `${prefix}: Invalid geometry detected. Try enabling "Make Valid" in Advanced Options to automatically fix geometry errors.`;
        }

        // SQL/WHERE clause errors
        if (
          lowerMsg.includes("sql") &&
          (lowerMsg.includes("parse") || lowerMsg.includes("syntax"))
        ) {
          return `${prefix}: Invalid WHERE clause syntax. Check your Attribute Filter in Advanced Options and use proper SQL syntax (e.g., field > 100 or field = 'value').`;
        }

        // Field/attribute errors
        if (
          lowerMsg.includes("field") &&
          (lowerMsg.includes("not found") ||
            lowerMsg.includes("does not exist"))
        ) {
          return `${prefix}: Field not found. Check your "Select Fields" or "Attribute Filter" in Advanced Options to ensure field names are correct.`;
        }

        // Layer errors
        if (
          lowerMsg.includes("layer") &&
          (lowerMsg.includes("not found") ||
            lowerMsg.includes("does not exist"))
        ) {
          return `${prefix}: Layer not found. Try removing the custom Layer Name in Advanced Options to use the default layer, or check the spelling.`;
        }

        // Empty dataset
        if (
          lowerMsg.includes("no features") ||
          (lowerMsg.includes("empty") && lowerMsg.includes("layer"))
        ) {
          return `${prefix}: No features found. The file may be empty, or your filters (Geometry Type Filter, Attribute Filter) may be excluding all features.`;
        }

        // Mixed geometry types (especially for Shapefiles)
        if (
          lowerMsg.includes("mixed geometry") ||
          lowerMsg.includes("geometry type")
        ) {
          return `${prefix}: Mixed geometry types detected. The conversion should handle this automatically, but you can also try filtering by specific geometry type in Advanced Options.`;
        }

        // Z dimension issues
        if (
          lowerMsg.includes("z dimension") ||
          lowerMsg.includes("3d") ||
          lowerMsg.includes("elevation")
        ) {
          return `${prefix}: Issue with 3D coordinates. Try toggling "Keep Z Dimension" in Advanced Options.`;
        }

        return errorMsg;
      };

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        setToast({
          isOpen: true,
          message: `Successfully converted ${successCount} file${successCount > 1 ? "s" : ""}!`,
          type: "success",
        });
      } else if (successCount > 0 && failCount > 0) {
        setToast({
          isOpen: true,
          message: `Converted ${successCount} file${successCount > 1 ? "s" : ""}, ${failCount} failed. Check console for details.`,
          type: "error",
        });
        console.error("Failed conversions:", errors);
      } else {
        const firstError = errors[0] || "Unknown error";
        setToast({
          isOpen: true,
          message: friendlyErrorMessage(firstError),
          type: "error",
        });
      }
    } catch (error) {
      console.error("Conversion error:", error);
      setToast({
        isOpen: true,
        message: `Conversion failed: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background:
          "radial-gradient(ellipse at bottom, #18181b 0%, #09090b 100%)",
      }}
    >
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
                        disabled={
                          isInitializing ||
                          isLoadingPreview ||
                          isConverting ||
                          resolvingSourceCrs ||
                          resolvingTargetCrs
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                      >
                        {isLoadingPreview ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                        <span>{isLoadingPreview ? "Loading..." : "Preview"}</span>
                      </button>
                    ) : (
                      <Dropdown>
                        <DropdownButton
                          as="button"
                          disabled={
                            isInitializing ||
                            isLoadingPreview ||
                            isConverting ||
                            resolvingSourceCrs ||
                            resolvingTargetCrs
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                        >
                          {isLoadingPreview ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                          <span>{isLoadingPreview ? "Loading..." : "Preview"}</span>
                          <ChevronDownIcon className="w-3 h-3" />
                        </DropdownButton>
                        <DropdownMenu className="max-h-64 overflow-y-auto z-[9999]">
                          {selectedFiles.map((file, index) => (
                            <DropdownItem
                              key={index}
                              onClick={() => extractPreviewData(file)}
                            >
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
                          "flex-1 flex items-center justify-center gap-3 px-6 py-12",
                          "border-2 border-dashed rounded-xl cursor-pointer",
                          "transition-all duration-200",
                          isDragging &&
                            "border-emerald-400 bg-emerald-500/10 scale-[1.02]",
                          !isDragging &&
                            selectedFiles.length > 0 &&
                            "border-emerald-500/50 bg-emerald-500/5",
                          !isDragging &&
                            selectedFiles.length === 0 &&
                            "border-zinc-700 hover:border-zinc-600 bg-zinc-900/30",
                        )}
                      >
                        <DocumentArrowUpIcon
                          className={clsx(
                            "w-8 h-8",
                            isDragging ? "text-emerald-400" : "text-zinc-400",
                          )}
                        />
                        <div className="text-center">
                          <p
                            className={clsx(
                              "font-medium",
                              isDragging ? "text-emerald-300" : "text-zinc-300",
                            )}
                          >
                            {isDragging
                              ? "Drop files or folders here"
                              : selectedFiles.length > 0
                                ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                                : "Drop files here or click to browse"}
                          </p>
                          <p className="text-sm text-zinc-500 mt-1">
                            {selectedFiles.length > 0
                              ? `Total: ${(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2)} KB`
                              : "Multiple file selection supported"}
                          </p>
                        </div>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("folder-select")?.click()
                      }
                      className="mt-2 w-full px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
                    >
                      Or select a folder
                    </button>
                  </div>

                  {/* File List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <Text className="text-xs font-medium text-zinc-400">
                          Selected Files
                        </Text>
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
                            <span className="text-zinc-300 truncate flex-1">
                              {file.name}
                            </span>
                            <span className="text-zinc-500 ml-2">
                              {(file.size / 1024).toFixed(2)} KB
                            </span>
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
                          setInputFormat(e.target.value);
                          setFormatAutoDetected(false);
                        }}
                        className={
                          formatAutoDetected ? "ring-2 ring-emerald-500/30" : ""
                        }
                      >
                        {READABLE_FORMATS.map((format) => {
                          const optionLabel = format.capabilities.write
                            ? format.label
                            : `${format.label} (input only)`;
                          return (
                            <option key={format.value} value={format.value}>
                              {optionLabel}
                            </option>
                          );
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
                            : `${format.label} (output only)`;
                          return (
                            <option key={format.value} value={format.value}>
                              {optionLabel}
                            </option>
                          );
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
                  <span>{showAdvanced ? "▼" : "▶"}</span>
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
                          Reproject coordinates between different coordinate
                          systems
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
                              {sourceCrs === "custom" && (
                                <Input
                                  type="text"
                                  value={customSourceCrs}
                                  onChange={(e) =>
                                    setCustomSourceCrs(e.target.value)
                                  }
                                  onBlur={handleSourceCustomBlur}
                                  placeholder="EPSG:4326 (auto-converts) or +proj=longlat +datum=WGS84..."
                                  className="mt-2"
                                  disabled={resolvingSourceCrs}
                                />
                              )}
                              <Text className="text-xs text-zinc-500 mt-2">
                                {resolvingSourceCrs ? (
                                  <span className="text-emerald-400">
                                    ⏳ Resolving EPSG code to PROJ string...
                                  </span>
                                ) : (
                                  <>
                                    💡 Enter <span className="font-mono text-emerald-400">EPSG:####</span> (e.g., EPSG:4326) to auto-translate, or paste a full PROJ string. Leave empty to auto-detect from file.
                                  </>
                                )}
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
                              {targetCrs === "custom" && (
                                <Input
                                  type="text"
                                  value={customTargetCrs}
                                  onChange={(e) =>
                                    setCustomTargetCrs(e.target.value)
                                  }
                                  onBlur={handleTargetCustomBlur}
                                  placeholder="EPSG:3857 (auto-converts) or +proj=merc +lon_0=0..."
                                  className="mt-2"
                                  disabled={resolvingTargetCrs}
                                />
                              )}
                              <Text className="text-xs text-zinc-500 mt-2">
                                {resolvingTargetCrs ? (
                                  <span className="text-emerald-400">
                                    ⏳ Resolving EPSG code to PROJ string...
                                  </span>
                                ) : (
                                  <>
                                    💡 Enter <span className="font-mono text-emerald-400">EPSG:####</span> (e.g., EPSG:3857) to auto-translate, or paste a full PROJ string. Leave empty for no transformation.
                                  </>
                                )}
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
                              <div className="flex justify-between items-center">
                                <Label>Skip Failures</Label>
                                <Switch
                                  checked={skipFailures}
                                  onChange={setSkipFailures}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Skip invalid features instead of failing entire
                                conversion
                              </Text>
                            </Field>

                            <Field>
                              <div className="flex items-center justify-between">
                                <Label>Make Valid</Label>
                                <Switch
                                  checked={makeValid}
                                  onChange={setMakeValid}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Auto-fix self-intersecting polygons and topology
                                errors
                              </Text>
                            </Field>

                            <Field>
                              <div className="flex items-center justify-between">
                                <Label>Keep Z Dimension</Label>
                                <Switch checked={keepZ} onChange={setKeepZ} />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Preserve 3D coordinates (default: 2D)
                              </Text>
                            </Field>

                            <Field>
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

                            <Field>
                              <div className="flex items-center justify-between">
                                <Label>Preserve FID</Label>
                                <Switch
                                  checked={preserveFid}
                                  onChange={setPreserveFid}
                                />
                              </div>
                              <Text className="text-xs text-zinc-500 mt-1">
                                Keep original feature IDs (for stable
                                references)
                              </Text>
                            </Field>
                          </div>

                          {/* Simplify */}
                          <Field>
                            <Label>Simplify Tolerance (optional)</Label>
                            <Input
                              type="number"
                              value={simplifyTolerance}
                              onChange={(e) =>
                                setSimplifyTolerance(
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="0"
                              step="0.0001"
                              min="0"
                            />
                            <Text className="text-xs text-zinc-500 mt-2">
                              Reduce geometry vertices using Douglas-Peucker
                              algorithm
                            </Text>
                            <Text className="text-xs text-zinc-600 mt-1">
                              0 = disabled. Try 0.0001–0.01 for web maps, higher
                              values for less detail
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
                                onChange={(e) =>
                                  setGeometryTypeFilter(e.target.value)
                                }
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
                                placeholder="population > 100000 OR area > 50"
                              />
                              <Text className="text-xs text-zinc-500 mt-2">
                                SQL syntax. Examples:{" "}
                                <code className="text-emerald-400 font-mono">
                                  type IN ("road","path")
                                </code>{" "}
                                or{" "}
                                <code className="text-emerald-400 font-mono">
                                  area {">"} 1000
                                </code>
                              </Text>
                            </Field>

                            {/* Field Selection */}
                            <Field>
                              <Label>Select Fields (optional)</Label>
                              <Input
                                type="text"
                                value={selectFields}
                                onChange={(e) =>
                                  setSelectFields(e.target.value)
                                }
                                placeholder="e.g., name,type,lanes"
                              />
                              <Text className="text-xs text-zinc-500 mt-2">
                                Comma-separated list of fields to include (empty
                                = all fields)
                              </Text>
                            </Field>
                          </div>
                        </FieldGroup>
                      </div>

                      {/* Format-Specific Options */}
                      {(outputFormat === "geojson" ||
                        outputFormat === "csv") && (
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
                              {outputFormat === "geojson" && (
                                <Field>
                                  <Label>
                                    Coordinate Precision: {geojsonPrecision}
                                  </Label>
                                  <input
                                    type="range"
                                    min="5"
                                    max="10"
                                    value={geojsonPrecision}
                                    onChange={(e) =>
                                      setGeojsonPrecision(
                                        parseInt(e.target.value),
                                      )
                                    }
                                    className="w-full accent-emerald-500"
                                  />
                                  <Text className="text-xs text-zinc-500 mt-2">
                                    Number of decimal places for coordinates (5
                                    = ~1m, 7 = ~1cm, 10 = ~1mm)
                                  </Text>
                                </Field>
                              )}

                              {/* CSV Geometry Mode */}
                              {outputFormat === "csv" && (
                                <Field>
                                  <Label>Geometry Format</Label>
                                  <Select
                                    value={csvGeometryMode}
                                    onChange={(e) =>
                                      setCsvGeometryMode(e.target.value)
                                    }
                                  >
                                    <option value="WKT">
                                      WKT (Well-Known Text)
                                    </option>
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

                      {/* Large File Tips */}
                      <div className="space-y-3 pt-4 border-t border-zinc-800">
                        <Text className="font-medium text-zinc-300">
                          💡 Tips for Large Files (50+ MB)
                        </Text>
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <Text className="text-xs text-amber-200 font-medium mb-2">
                            ⚠️ Browser Limitation: 2 GB WebAssembly Memory Limit
                          </Text>
                          <Text className="text-xs text-zinc-300 space-y-1">
                            <div className="mb-2">Files over 100 MB may fail. To process large datasets:</div>
                            <div className="ml-3 space-y-1">
                              <div>• <strong>Process in chunks:</strong> Use "Attribute Filter" to split data (e.g., "FID {'<'} 10000")</div>
                              <div>• <strong>Reduce complexity:</strong> Enable "Simplify Tolerance" (0.001-0.01 for web maps)</div>
                              <div>• <strong>Remove attributes:</strong> Use "Select Fields" to include only essential fields</div>
                              <div>• <strong>Disable Z coords:</strong> Turn off "Keep Z Dimension" (saves 33% memory)</div>
                              <div>• <strong>Filter geometry:</strong> Use "Geometry Type Filter" to process one type at a time</div>
                              <div>• <strong>Desktop alternative:</strong> For files {'>'} 200 MB, use QGIS or ogr2ogr instead</div>
                            </div>
                          </Text>
                        </div>
                      </div>

                      {/* Automatic Features Info */}
                      <div className="space-y-3 pt-4 border-t border-zinc-800">
                        <Text className="font-medium text-zinc-300">
                          Built-in Optimizations
                        </Text>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <Text className="text-xs text-zinc-400">
                              <strong className="text-zinc-300">
                                Shapefile Geometry Splitting:
                              </strong>{" "}
                              Mixed geometries automatically split by type
                              (points, lines, polygons) with multi-promotion
                            </Text>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <Text className="text-xs text-zinc-400">
                              <strong className="text-zinc-300">
                                Format Optimizations:
                              </strong>{" "}
                              GeoJSON with bbox, GeoPackage with spatial index,
                              Shapefile with UTF-8, CSV with geometry handling
                            </Text>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <Text className="text-xs text-zinc-400">
                              <strong className="text-zinc-300">
                                Smart CRS:
                              </strong>{" "}
                              Auto-detects existing CRS, intelligently assigns
                              vs transforms based on source data
                            </Text>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">⚙</span>
                            <Text className="text-xs text-zinc-400">
                              <strong className="text-zinc-300">
                                Default Behavior:
                              </strong>{" "}
                              2D output (toggle "Keep Z"), explode collections
                              ON, precision=7 for GeoJSON
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
                  disabled={
                    !selectedFiles ||
                    selectedFiles.length === 0 ||
                    isInitializing ||
                    isConverting ||
                    isLoadingPreview
                  }
                  className="w-full"
                >
                  {isInitializing ? (
                    <>
                      <ArrowPathIcon
                        data-slot="icon"
                        className="animate-spin"
                      />
                      <span>Initializing...</span>
                    </>
                  ) : isConverting ? (
                    <>
                      <ArrowPathIcon
                        data-slot="icon"
                        className="animate-spin"
                      />
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
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />

      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
