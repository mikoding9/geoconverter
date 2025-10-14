import { motion, AnimatePresence } from 'motion/react'
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/button'

export function HelpDialog({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900/95 border border-zinc-700/50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <QuestionMarkCircleIcon className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-xl font-semibold text-zinc-100">How to Use GeoConverter</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* What is GeoConverter */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">What is GeoConverter?</h3>
                  <p className="text-zinc-300 leading-relaxed">
                    GeoConverter is a powerful, privacy-first geospatial file converter that runs entirely in your browser.
                    Transform vector data between 10 different GIS formats without uploading files to any server.
                    All processing happens locally using WebAssembly, powered by GDAL/OGR - the industry-standard geospatial library.
                  </p>
                </section>

                {/* Who Should Use This */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">Who Should Use This?</h3>
                  <ul className="space-y-2 text-zinc-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong className="text-zinc-200">GIS Professionals:</strong> Convert between formats for different GIS software (QGIS, ArcGIS, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong className="text-zinc-200">Web Developers:</strong> Prepare geospatial data for web mapping applications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong className="text-zinc-200">Data Analysts:</strong> Convert spatial data for analysis in different tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong className="text-zinc-200">GPS Users:</strong> Convert tracks and waypoints between formats</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span><strong className="text-zinc-200">Students & Educators:</strong> Learn about geospatial formats and transformations</span>
                    </li>
                  </ul>
                </section>

                {/* How to Use */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">How to Use</h3>
                  <div className="space-y-3">
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">1</span>
                        <div>
                          <h4 className="font-semibold text-zinc-200 mb-1">Upload Your File</h4>
                          <p className="text-sm text-zinc-400">Drag & drop or click to select a geospatial file. We auto-detect the format!</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">2</span>
                        <div>
                          <h4 className="font-semibold text-zinc-200 mb-1">Choose Output Format</h4>
                          <p className="text-sm text-zinc-400">Select from 10 formats: GeoJSON, Shapefile, GeoPackage, KML, GPX, GML, FlatGeobuf, CSV, PMTiles, or MBTiles</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">3</span>
                        <div>
                          <h4 className="font-semibold text-zinc-200 mb-1">Configure Options (Optional)</h4>
                          <p className="text-sm text-zinc-400">Click "Advanced Options" to transform coordinates, filter features, simplify geometries, and more</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">4</span>
                        <div>
                          <h4 className="font-semibold text-zinc-200 mb-1">Convert & Download</h4>
                          <p className="text-sm text-zinc-400">Click the button to process and download your converted file instantly</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Key Features */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">🔒 Privacy First</h4>
                      <p className="text-xs text-zinc-400">100% client-side processing. Your files never leave your browser.</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">🌍 CRS Transformation</h4>
                      <p className="text-xs text-zinc-400">Reproject coordinates between systems using the built-in PROJ strings, auto-resolve EPSG codes, or supply your own custom definition</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">🎯 Smart Filtering</h4>
                      <p className="text-xs text-zinc-400">Filter by geometry type, attributes (SQL WHERE), or select specific fields</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">✨ Geometry Processing</h4>
                      <p className="text-xs text-zinc-400">Simplify, validate, explode collections, control dimensions (2D/3D)</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">📊 Preview Data</h4>
                      <p className="text-xs text-zinc-400">View metadata, bounding box, and attributes before conversion</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">⚡ Fast & Efficient</h4>
                      <p className="text-xs text-zinc-400">WebAssembly-powered GDAL for near-native performance</p>
                    </div>
                  </div>
                </section>

                {/* Supported Formats */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">Supported Formats</h3>
                  <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>GeoJSON</strong> - Web-friendly, JSON-based format</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>Shapefile</strong> - Industry standard (ESRI)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>GeoPackage</strong> - Modern SQLite-based format</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>KML</strong> - Google Earth/Maps format</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>GPX</strong> - GPS Exchange Format</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>GML</strong> - Geography Markup Language (OGC)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>FlatGeobuf</strong> - Cloud-optimized streaming format</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>CSV</strong> - Tabular format with WKT or X/Y geometry</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>PMTiles</strong> - Cloud-optimized tiled format</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-300"><strong>MBTiles</strong> - SQLite-based tile format (Mapbox)</span>
                    </div>
                  </div>
                </section>

                {/* Tips & Tricks */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">Tips & Tricks</h3>
                  <ul className="space-y-2 text-sm text-zinc-300">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <span>Use the <strong className="text-zinc-200">Preview</strong> button to inspect your data before conversion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <span>For web maps, convert to <strong className="text-zinc-200">GeoJSON</strong> or <strong className="text-zinc-200">FlatGeobuf</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <span>Use <strong className="text-zinc-200">Simplify</strong> to reduce file size for web applications (try 0.0001-0.01)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <span>Enable <strong className="text-zinc-200">Make Valid</strong> to automatically fix geometry errors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <span>Shapefiles are automatically split by geometry type (points, lines, polygons)</span>
                    </li>
                  </ul>
                </section>

                {/* Common Use Cases */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">Common Use Cases</h3>
                  <div className="space-y-3">
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">📱 Preparing data for web mapping</h4>
                      <p className="text-xs text-zinc-400">Convert to GeoJSON → Simplify → Reduce coordinate precision</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">🗺️ Converting GPS tracks</h4>
                      <p className="text-xs text-zinc-400">GPX from your device → GeoJSON or KML for visualization</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">🔄 Cross-platform compatibility</h4>
                      <p className="text-xs text-zinc-400">Shapefile from ArcGIS → GeoPackage for QGIS</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">🌐 Coordinate system transformation</h4>
                      <p className="text-xs text-zinc-400">Web Mercator → WGS84 for GPS compatibility</p>
                    </div>
                  </div>
                </section>

                {/* Privacy Notice */}
                <section className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <h3 className="text-lg font-semibold text-emerald-400">Your Data is Safe</h3>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    All file processing happens entirely in your browser using WebAssembly.
                    Your files are never uploaded to any server, and we don't collect or store any of your data.
                    This is true client-side computing - your data remains private and secure on your device.
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800 px-6 py-4 flex justify-end">
                <Button
                  color="emerald"
                  onClick={onClose}
                >
                  Got it, Let's Convert!
                </Button>
              </div>
            </motion.div>
          </div>
      )}
    </AnimatePresence>
  )
}
