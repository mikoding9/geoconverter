import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { XMarkIcon, QuestionMarkCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/button'

export function HelpDialog({ isOpen, onClose }) {
  const [openFaq, setOpenFaq] = useState({})

  const toggleFaq = (id) => {
    setOpenFaq(prev => ({ ...prev, [id]: !prev[id] }))
  }
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
                {/* 1. How to Use */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">How to Use</h3>
                  <div className="space-y-3">
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">1</span>
                        <div>
                          <h4 className="font-semibold text-zinc-200 mb-1">Select Your File</h4>
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

                {/* 2. FAQ with Accordion */}
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-400">Frequently Asked Questions</h3>
                  <div className="space-y-2">
                    {/* FAQ: What is GeoConverter */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('what-is')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">What is GeoConverter?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['what-is'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['what-is'] && (
                        <div className="px-4 pb-4 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800 pt-3">
                          GeoConverter is a powerful, privacy-first geospatial file converter that runs entirely in your browser.
                          Transform vector data between 30+ different GIS formats without sending files to any server.
                          All processing happens locally using WebAssembly, powered by GDAL/OGR - the industry-standard geospatial library.
                        </div>
                      )}
                    </div>

                    {/* FAQ: Who Should Use This */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('who-should-use')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">Who Should Use This?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['who-should-use'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['who-should-use'] && (
                        <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                          <ul className="space-y-2 text-sm text-zinc-300">
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
                        </div>
                      )}
                    </div>

                    {/* FAQ: Shapefile Upload */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('shapefile')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">How do I upload Shapefiles?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['shapefile'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['shapefile'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>
                            Shapefiles consist of multiple files that must be uploaded together as a <strong className="text-zinc-200">ZIP archive</strong>.
                          </p>
                          <p className="text-xs text-zinc-400">
                            A typical shapefile ZIP should contain:
                          </p>
                          <ul className="text-xs text-zinc-400 ml-4 space-y-1">
                            <li>• <code className="text-emerald-400">.shp</code> - geometry data (required)</li>
                            <li>• <code className="text-emerald-400">.shx</code> - shape index (required)</li>
                            <li>• <code className="text-emerald-400">.dbf</code> - attribute data (required)</li>
                            <li>• <code className="text-emerald-400">.prj</code> - projection info (optional but recommended)</li>
                            <li>• <code className="text-emerald-400">.cpg</code> - encoding info (optional)</li>
                          </ul>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs text-amber-200/90 mt-2">
                            <strong>⚠️ Important:</strong> Currently, only <strong>one shapefile set per ZIP</strong> is supported. If you have multiple shapefiles, convert them separately.
                          </div>
                          <p className="text-xs text-zinc-400">
                            💡 Simply select all shapefile components and create a ZIP before uploading.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* FAQ: CRS */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('crs')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">How do I supply coordinate reference systems (CRS)?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['crs'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['crs'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>You can specify CRS in two formats:</p>
                          <div className="space-y-2 text-xs">
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-400 mb-1"><strong className="text-zinc-200">1. EPSG Codes</strong> (recommended):</p>
                              <code className="text-emerald-400">epsg:4326</code> <span className="text-zinc-500">(WGS 84)</span><br/>
                              <code className="text-emerald-400">epsg:3857</code> <span className="text-zinc-500">(Web Mercator)</span><br/>
                              <code className="text-emerald-400">epsg:32633</code> <span className="text-zinc-500">(UTM Zone 33N)</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-400 mb-1"><strong className="text-zinc-200">2. PROJ Strings</strong> (advanced):</p>
                              <code className="text-emerald-400">+proj=longlat +datum=WGS84 +no_defs</code><br/>
                              <code className="text-emerald-400">+proj=merc +a=6378137 +b=6378137</code>
                            </div>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-200/90 mt-2">
                            <strong>ℹ️ Auto-translation:</strong> When you enter an EPSG code (e.g., <code className="text-blue-300">epsg:4326</code>), it will be automatically translated to a PROJ string when you <strong>click outside the input box</strong>. PROJ strings are the actual format used for conversion.
                          </div>
                          <p className="text-xs text-zinc-400">
                            💡 Leave the Source CRS field empty to auto-detect from your file (works if the file contains projection info).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* FAQ: When to Use Skip Failures */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('when-skip-failures')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">When should I use "Skip Failures"?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['when-skip-failures'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['when-skip-failures'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>Enable "Skip Failures" in these common scenarios:</p>
                          <div className="space-y-2 text-xs text-zinc-300 mt-2">
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-200 font-semibold mb-1">📍 GPX to GeoJSON conversion</p>
                              <p className="text-zinc-400">
                                GPX files often contain metadata elements that cannot be converted to geometries.
                                Enable "Skip Failures" to ignore these non-geometric features and convert only the actual track points, routes, and waypoints.
                              </p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-200 font-semibold mb-1">🔧 Datasets with known errors</p>
                              <p className="text-zinc-400">
                                When working with large datasets that may contain a few invalid features,
                                you can extract the valid data instead of failing the entire conversion.
                              </p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-200 font-semibold mb-1">🌐 Mixed or complex source data</p>
                              <p className="text-zinc-400">
                                Files with mixed geometry types, unsupported elements, or edge cases that may cause some features to fail validation.
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">
                            💡 Combine with <strong className="text-zinc-200">"Make Valid"</strong> to auto-fix geometry errors before skipping failures.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* FAQ: What Happens Skip Failures */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('skip-failures')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">What happens when I enable "Skip Failures"?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['skip-failures'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['skip-failures'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>
                            When enabled, GeoConverter will skip invalid features instead of failing the entire conversion.
                          </p>
                          <div className="text-xs text-zinc-400 space-y-1 bg-zinc-900/50 border border-zinc-700/50 rounded p-3">
                            <p><strong className="text-zinc-200">Without Skip Failures (default):</strong></p>
                            <p>• Conversion stops if any feature has errors</p>
                            <p>• You'll see an error message explaining what went wrong</p>
                            <p>• No output file is generated</p>

                            <p className="pt-2"><strong className="text-zinc-200">With Skip Failures enabled:</strong></p>
                            <p>• Invalid features are skipped silently</p>
                            <p>• Valid features are processed successfully</p>
                            <p>• Output file contains only valid features</p>
                          </div>
                          <p className="text-xs text-zinc-400">
                            💡 This is especially useful for GPX files and datasets with metadata or non-geometric elements.
                          </p>
                        </div>
                      )}
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
                  <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 space-y-3 text-sm text-zinc-300">
                    <p>
                      Convert between <strong className="text-zinc-100">30+ GDAL vector formats</strong> including popular
                      GIS standards and specialist workflows.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>
                          <strong>GeoJSON, GeoPackage, Shapefile</strong>, KML, GPX, GML, FlatGeobuf, CSV, DXF, DGN
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>
                          <strong>MBTiles, PMTiles, SQLite, XLSX</strong>, JSON-FG, GeoRSS, MapML, GeoJSONSeq, Geoconcept
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>
                          S-57, Selafin, VICAR, WAsP, ODS, OGR GMT, PCIDSK, PDS4, VDV and more
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">ⓘ</span>
                        <span>
                          <strong>TopoJSON</strong> is input-only; <strong>PGDump</strong> is output-only for PostGIS dumps
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Need something else? Let us know via the feedback form—GDAL supports dozens more drivers.
                    </p>
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
                    Your files are never sent to any server, and we don't collect or store any of your data.
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
