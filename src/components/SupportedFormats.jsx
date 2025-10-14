import { useState } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'

const SUPPORTED_FORMATS = [
  {
    value: 'geojson',
    label: 'GeoJSON',
    ext: '.geojson',
    description: 'Open standard format for representing geographic features using JSON. Web-friendly and human-readable.',
    useCase: 'Web mapping, APIs, JavaScript applications'
  },
  {
    value: 'topojson',
    label: 'TopoJSON',
    ext: '.topojson',
    description: 'Topology-preserving extension of GeoJSON that shares borders between features to reduce file size.',
    useCase: 'Web visualizations, D3.js, compact boundary datasets'
  },
  {
    value: 'shapefile',
    label: 'Shapefile',
    ext: '.zip',
    description: 'Industry-standard format developed by Esri. Consists of multiple files (.shp, .shx, .dbf, .prj) packaged as ZIP.',
    useCase: 'Desktop GIS, legacy systems, ArcGIS'
  },
  {
    value: 'geopackage',
    label: 'GeoPackage',
    ext: '.gpkg',
    description: 'Modern SQLite-based format that stores vector and raster data in a single file. Open standard by OGC.',
    useCase: 'Mobile apps, offline mapping, QGIS'
  },
  {
    value: 'kml',
    label: 'KML',
    ext: '.kml',
    description: 'XML-based format created by Google for Earth and Maps. Supports styling and 3D visualization.',
    useCase: 'Google Earth, Google Maps, visualization'
  },
  {
    value: 'gpx',
    label: 'GPX',
    ext: '.gpx',
    description: 'GPS Exchange Format for waypoints, routes, and tracks. XML-based and widely supported by GPS devices.',
    useCase: 'GPS devices, fitness apps, route planning'
  },
  {
    value: 'gml',
    label: 'GML',
    ext: '.gml',
    description: 'Geography Markup Language, an XML grammar for geographic features. OGC standard for data exchange.',
    useCase: 'Enterprise GIS, standards compliance'
  },
  {
    value: 'flatgeobuf',
    label: 'FlatGeobuf',
    ext: '.fgb',
    description: 'Cloud-native format optimized for streaming and random access. Very fast with spatial index built-in.',
    useCase: 'Web mapping, large datasets, cloud storage'
  },
  {
    value: 'dxf',
    label: 'DXF',
    ext: '.dxf',
    description: 'AutoCAD Drawing Exchange Format for CAD interoperability. Great for sharing GIS features with engineering teams.',
    useCase: 'CAD/GIS workflows, infrastructure planning, survey data'
  },
  {
    value: 'csv',
    label: 'CSV',
    ext: '.csv',
    description: 'Comma-separated values with geometry as WKT or X/Y columns. Simple format for tabular GIS data.',
    useCase: 'Spreadsheets, databases, point data'
  },
  {
    value: 'pmtiles',
    label: 'PMTiles',
    ext: '.pmtiles',
    description: 'Cloud-optimized format for tiled map data. Single-file archive with efficient HTTP range requests.',
    useCase: 'Web mapping, tile servers, cloud storage'
  },
  {
    value: 'mbtiles',
    label: 'MBTiles',
    ext: '.mbtiles',
    description: 'SQLite-based format for storing tile data. Developed by Mapbox for offline mapping and tile distribution.',
    useCase: 'Offline maps, mobile apps, tile servers'
  },
]

export function SupportedFormats({ className }) {
  const [expandedFormat, setExpandedFormat] = useState(null)

  const wrapperClass = className ?? 'lg:col-span-3'

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className={clsx(wrapperClass)}
    >
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 sticky top-24 shadow-2xl">
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Supported Formats</h3>
        <div className="space-y-1">
          {SUPPORTED_FORMATS.map((format) => (
            <div key={format.value} className="border-b border-zinc-800/50 last:border-0">
              <button
                onClick={() => setExpandedFormat(expandedFormat === format.value ? null : format.value)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-800/50 rounded transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">{format.label}</span>
                  <span className="text-zinc-500 text-xs">
                    {expandedFormat === format.value ? '▼' : '▶'}
                  </span>
                </div>
              </button>
              {expandedFormat === format.value && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-3 space-y-2"
                >
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {format.description}
                  </p>
                  <div className="pt-2 border-t border-zinc-800/30 mt-2">
                    <p className="text-xs text-emerald-400/80 italic">
                      💡 {format.useCase}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  )
}

export { SUPPORTED_FORMATS }
