import { useState } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'

const CAPABILITIES = Object.freeze({
  inputOutput: Object.freeze({ read: true, write: true }),
  inputOnly: Object.freeze({ read: true, write: false }),
  outputOnly: Object.freeze({ read: false, write: true })
})

const SUPPORTED_FORMATS = [
  {
    value: 'geojson',
    label: 'GeoJSON',
    downloadExt: '.geojson',
    extensions: ['geojson', 'json'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Open standard format for representing geographic features using JSON. Web-friendly and human-readable.',
    useCase: 'Web mapping, APIs, JavaScript applications'
  },
  {
    value: 'topojson',
    label: 'TopoJSON',
    downloadExt: '.topojson',
    extensions: ['topojson'],
    capabilities: CAPABILITIES.inputOnly,
    description: 'Topology-preserving extension of GeoJSON that shares borders between features to reduce file size.',
    useCase: 'Web visualizations, D3.js, compact boundary datasets'
  },
  {
    value: 'shapefile',
    label: 'Shapefile',
    downloadExt: '.zip',
    extensions: ['shp.zip', 'zip', 'shp'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Industry-standard format developed by Esri. Consists of multiple files (.shp, .shx, .dbf, .prj) packaged as ZIP.',
    useCase: 'Desktop GIS, legacy systems, ArcGIS'
  },
  {
    value: 'geopackage',
    label: 'GeoPackage',
    downloadExt: '.gpkg',
    extensions: ['gpkg'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Modern SQLite-based format that stores vector and raster data in a single file. Open standard by OGC.',
    useCase: 'Mobile apps, offline mapping, QGIS'
  },
  {
    value: 'kml',
    label: 'KML',
    downloadExt: '.kml',
    extensions: ['kml'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'XML-based format created by Google for Earth and Maps. Supports styling and 3D visualization.',
    useCase: 'Google Earth, Google Maps, visualization'
  },
  {
    value: 'gpx',
    label: 'GPX',
    downloadExt: '.gpx',
    extensions: ['gpx'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'GPS Exchange Format for waypoints, routes, and tracks. XML-based and widely supported by GPS devices.',
    useCase: 'GPS devices, fitness apps, route planning'
  },
  {
    value: 'gml',
    label: 'GML',
    downloadExt: '.gml',
    extensions: ['gml'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Geography Markup Language, an XML grammar for geographic features. OGC standard for data exchange.',
    useCase: 'Enterprise GIS, standards compliance'
  },
  {
    value: 'flatgeobuf',
    label: 'FlatGeobuf',
    downloadExt: '.fgb',
    extensions: ['fgb'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Cloud-native format optimized for streaming and random access. Very fast with spatial index built-in.',
    useCase: 'Web mapping, large datasets, cloud storage'
  },
  {
    value: 'dxf',
    label: 'DXF',
    downloadExt: '.dxf',
    extensions: ['dxf'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'AutoCAD Drawing Exchange Format for CAD interoperability. Great for sharing GIS features with engineering teams.',
    useCase: 'CAD/GIS workflows, infrastructure planning, survey data'
  },
  {
    value: 'csv',
    label: 'CSV',
    downloadExt: '.csv',
    extensions: ['csv'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Comma-separated values with geometry as WKT or X/Y columns. Simple format for tabular GIS data.',
    useCase: 'Spreadsheets, databases, point data'
  },
  {
    value: 'pmtiles',
    label: 'PMTiles',
    downloadExt: '.pmtiles',
    extensions: ['pmtiles'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Cloud-optimized format for tiled map data. Single-file archive with efficient HTTP range requests.',
    useCase: 'Web mapping, tile servers, cloud storage'
  },
  {
    value: 'mbtiles',
    label: 'MBTiles',
    downloadExt: '.mbtiles',
    extensions: ['mbtiles'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'SQLite-based format for storing tile data. Developed by Mapbox for offline mapping and tile distribution.',
    useCase: 'Offline maps, mobile apps, tile servers'
  },
  {
    value: 'dgn',
    label: 'DGN',
    downloadExt: '.dgn',
    extensions: ['dgn'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Bentley MicroStation design file for CAD/GIS interoperability and infrastructure projects.',
    useCase: 'Engineering design hand-off, CAD/GIS integration'
  },
  {
    value: 'geojsonseq',
    label: 'GeoJSONSeq',
    downloadExt: '.geojsonseq',
    extensions: ['geojsonseq', 'geojsons', 'geojsonl', 'jsonl', 'ndjson'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'GeoJSON Text Sequences storing newline-delimited features for streaming-friendly datasets.',
    useCase: 'Event streams, append-only logs, incremental ETL'
  },
  {
    value: 'georss',
    label: 'GeoRSS',
    downloadExt: '.georss',
    extensions: ['georss', 'rss'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Geographically-enabled RSS/Atom feeds for sharing news items with coordinates.',
    useCase: 'Alert feeds, geotagged news, syndication'
  },
  {
    value: 'geoconcept',
    label: 'Geoconcept',
    downloadExt: '.gxt',
    extensions: ['gxt'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Vector exchange format for Geoconcept GIS, supporting layers and symbology.',
    useCase: 'Enterprise Geoconcept workflows, legacy system exchange'
  },
  {
    value: 'jml',
    label: 'JML',
    downloadExt: '.jml',
    extensions: ['jml'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'JMap layer format that stores features and styling in XML.',
    useCase: 'Java-based GIS deployments, JMap integrations'
  },
  {
    value: 'jsonfg',
    label: 'JSON-FG',
    downloadExt: '.jsonfg',
    extensions: ['jsonfg'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'OGC Features and Geometries JSON encoding designed for interoperable web APIs.',
    useCase: 'OGC compliant APIs, modern REST services'
  },
  {
    value: 'mapml',
    label: 'MapML',
    downloadExt: '.mapml',
    extensions: ['mapml'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Map Markup Language brings maps into HTML, allowing declarative map publishing.',
    useCase: 'OGC MapML web apps, accessible hypermaps'
  },
  {
    value: 'ods',
    label: 'ODS',
    downloadExt: '.ods',
    extensions: ['ods'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'OpenDocument Spreadsheet storing tabular geometries compatible with LibreOffice.',
    useCase: 'Office productivity workflows, spreadsheet-driven GIS'
  },
  {
    value: 'ogr_gmt',
    label: 'OGR GMT',
    downloadExt: '.gmt',
    extensions: ['gmt'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Generic Mapping Tools ASCII format for vector datasets.',
    useCase: 'Scientific cartography, GMT toolchain'
  },
  {
    value: 'pcidsk',
    label: 'PCIDSK',
    downloadExt: '.pix',
    extensions: ['pix'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'PCI Geomatics dataset supporting rich raster and vector content in a single container.',
    useCase: 'PCI Geomatics software, integrated raster/vector delivery'
  },
  {
    value: 'pds4',
    label: 'PDS4',
    downloadExt: '.pds4.xml',
    extensions: ['pds4', 'pds4.xml'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'NASA Planetary Data System 4 label + table structure for interplanetary mission data.',
    useCase: 'Planetary science archives, NASA data pipelines'
  },
  {
    value: 's57',
    label: 'S-57',
    downloadExt: '.000',
    extensions: ['000', 's57'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'IHO S-57 Electronic Navigational Chart transfer format.',
    useCase: 'Maritime navigation datasets, hydrographic offices'
  },
  {
    value: 'sqlite',
    label: 'SQLite',
    downloadExt: '.sqlite',
    extensions: ['sqlite', 'db'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Lightweight SQLite database storing vector layers, with optional SpatiaLite integration.',
    useCase: 'Embedded databases, field data collection'
  },
  {
    value: 'selafin',
    label: 'Selafin',
    downloadExt: '.slf',
    extensions: ['slf'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'SERAFIN/SELAFIN hydrodynamic mesh format for TELEMAC system results.',
    useCase: 'Hydraulic modelling, TELEMAC workflows'
  },
  {
    value: 'vdv',
    label: 'VDV',
    downloadExt: '.vdv',
    extensions: ['vdv'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'VDV-451 public transport data exchange format used across European transit agencies.',
    useCase: 'Transit scheduling, vehicle assignment planning'
  },
  {
    value: 'vicar',
    label: 'VICAR',
    downloadExt: '.vic',
    extensions: ['vic', 'vicar'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'NASA/JPL Video Image Communication and Retrieval container supporting imagery and metadata.',
    useCase: 'Planetary imaging pipelines, remote sensing archives'
  },
  {
    value: 'wasp',
    label: 'WAsP',
    downloadExt: '.map',
    extensions: ['wasp'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Wind Atlas Analysis and Application Program vector map format.',
    useCase: 'Wind resource assessment, turbine siting'
  },
  {
    value: 'xlsx',
    label: 'XLSX',
    downloadExt: '.xlsx',
    extensions: ['xlsx'],
    capabilities: CAPABILITIES.inputOutput,
    description: 'Microsoft Excel workbook with OGR support for vector data in worksheets.',
    useCase: 'Business reporting, lightweight data exchange'
  },
  {
    value: 'pgdump',
    label: 'PGDump',
    downloadExt: '.sql',
    extensions: [],
    capabilities: CAPABILITIES.outputOnly,
    description: 'PostgreSQL/PostGIS dump script suitable for loading into a database.',
    useCase: 'Database migrations, sharing PostGIS content as SQL'
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
                  <span className="flex items-center gap-2 text-xs text-zinc-500">
                    {format.capabilities.read && format.capabilities.write
                      ? 'Input · Output'
                      : format.capabilities.read
                        ? 'Input Only'
                        : 'Output Only'}
                    <span>{expandedFormat === format.value ? '▼' : '▶'}</span>
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
