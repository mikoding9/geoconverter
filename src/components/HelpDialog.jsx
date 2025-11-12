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
                          <p className="text-sm text-zinc-400">Select from 35+ formats including GeoJSON, Shapefile, GeoPackage, KML, GPX, GML, FlatGeobuf, CSV, PMTiles, MBTiles, and more</p>
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
                            Keep every companion file a shapefile needs inside a single <strong className="text-zinc-200">ZIP archive</strong> before dragging it into GeoConverter.
                          </p>
                          <p className="text-xs text-zinc-400">
                            Quick checklist for a healthy upload:
                          </p>
                          <ol className="text-xs text-zinc-400 ml-5 space-y-1 list-decimal">
                            <li>Place the matching <code className="text-emerald-400">.shp</code>, <code className="text-emerald-400">.shx</code>, <code className="text-emerald-400">.dbf</code>, and optional <code className="text-emerald-400">.prj/.cpg</code> files in the same folder.</li>
                            <li>Select those files (only one dataset at a time) and compress them into <code className="text-emerald-400">mydata.zip</code>.</li>
                            <li>Ensure the ZIP does not contain nested folders—files should live at the top level so GeoConverter can find them instantly.</li>
                            <li>Drop the ZIP onto the uploader; the app automatically unpacks, validates the trio of required parts, and reads the projection from <code className="text-emerald-400">.prj</code> when present.</li>
                          </ol>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs text-amber-200/90 mt-2">
                            <strong>⚠️ Important:</strong> Only <strong>one shapefile set per ZIP</strong> is supported today. Bundle additional datasets into their own ZIPs and convert sequentially.
                          </div>
                          <p className="text-xs text-zinc-400">
                            💡 If you are unsure whether every piece made it into the archive, open the ZIP first—missing <code className="text-emerald-400">.dbf</code> or <code className="text-emerald-400">.shx</code> files are the most common cause of upload errors.
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
                        <div className="px-4 pb-4 space-y-3 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>
                            GeoConverter reads CRS metadata automatically, but you can override it from <strong className="text-zinc-200">Advanced Options → CRS</strong> whenever the source file is missing or mislabeled.
                          </p>
                          <div className="space-y-2 text-xs">
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-400 mb-1"><strong className="text-zinc-200">EPSG codes (fastest):</strong></p>
                              <p className="text-zinc-400">Enter familiar identifiers like <code className="text-emerald-400">epsg:4326</code>, <code className="text-emerald-400">epsg:3857</code>, or <code className="text-emerald-400">epsg:32633</code>. GeoConverter instantly expands them to the required PROJ definition.</p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-400 mb-1"><strong className="text-zinc-200">Custom PROJ strings (advanced):</strong></p>
                              <p className="text-zinc-400">Paste full definitions such as <code className="text-emerald-400">+proj=merc +a=6378137 +b=6378137</code> for bespoke or local grids.</p>
                            </div>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-200/90">
                            <strong>ℹ️ Tip:</strong> Source CRS is optional when the dataset already advertises one. Target CRS is required only if you are reprojecting; leave it blank to keep the original coordinates.
                          </div>
                          <div className="grid gap-2 text-xs text-zinc-400">
                            <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2">
                              <p className="text-zinc-200 font-semibold">When to set Source CRS?</p>
                              <p>Use it when the file is missing a <code className="text-emerald-400">.prj</code> or when you know the metadata is wrong.</p>
                            </div>
                            <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2">
                              <p className="text-zinc-200 font-semibold">When to set Target CRS?</p>
                              <p>Fill it to reproject (e.g., convert local UTM data to <code className="text-emerald-400">epsg:4326</code> before exporting GeoJSON).</p>
                            </div>
                          </div>
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
                        <div className="px-4 pb-4 space-y-3 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>Turn this on when you would rather receive a usable partial dataset than stop at the first invalid feature.</p>
                          <div className="grid gap-2 text-xs text-zinc-300">
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-200 font-semibold mb-1">📍 GPX, KML, or CAD exports</p>
                              <p className="text-zinc-400">These formats often include metadata nodes without geometries. Skipping failures lets you keep the actual track points and polylines while ignoring unsupported bits.</p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-200 font-semibold mb-1">🔧 Imperfect datasets</p>
                              <p className="text-zinc-400">Large municipal layers sometimes contain a handful of invalid polygons. Rather than fixing everything first, skip the bad actors and come back to them later.</p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2">
                              <p className="text-zinc-200 font-semibold mb-1">🌐 Mixed geometry collections</p>
                              <p className="text-zinc-400">Collections that combine points, multipolygons, or exotic geometry types can trigger conversion errors—skipping failures ensures the supported features finish exporting.</p>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400">
                            💡 Pair with <strong className="text-zinc-200">Make Valid</strong> to repair easy fixes first, then skip anything that still cannot be converted.
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
                        <div className="px-4 pb-4 space-y-3 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>Skip Failures switches the converter into a "best effort" mode.</p>
                          <div className="text-xs text-zinc-300 grid gap-3 sm:grid-cols-2">
                            <div className="bg-zinc-900/50 border border-red-500/20 rounded p-3 space-y-1">
                              <p className="text-zinc-200 font-semibold">Without Skip Failures</p>
                              <p className="text-zinc-400">• Processing stops on the first invalid feature</p>
                              <p className="text-zinc-400">• You receive an error and no output is produced</p>
                              <p className="text-zinc-400">• Useful when you want to catch and fix every issue upfront</p>
                            </div>
                            <div className="bg-zinc-900/50 border border-emerald-500/20 rounded p-3 space-y-1">
                              <p className="text-zinc-200 font-semibold">With Skip Failures enabled</p>
                              <p className="text-zinc-400">• Problematic features are ignored; valid ones finish converting</p>
                              <p className="text-zinc-400">• The download contains only the successful features</p>
                              <p className="text-zinc-400">• Warning messages still explain what was skipped so you can follow up later</p>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400">
                            💡 Ideal when you are on a deadline and just need something usable—combine it with dataset copies so you can re-run the full conversion after cleaning errors.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* FAQ: File Size Limits */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('file-size')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">How large can my files be?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['file-size'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['file-size'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>
                            GeoConverter runs in your browser, so limits depend on your device memory rather than a server quota.
                          </p>
                          <ul className="text-xs text-zinc-400 space-y-1">
                            <li>• Files up to ~200&nbsp;MB usually convert smoothly on modern laptops.</li>
                            <li>• Very large datasets may require simplifying, tiling, or filtering before loading.</li>
                            <li>• Zipping Shapefiles or CSVs can shrink uploads dramatically and speeds up parsing.</li>
                          </ul>
                          <p className="text-xs text-zinc-400">
                            💡 If the tab becomes unresponsive, try closing other heavy applications or converting the dataset in smaller chunks.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* FAQ: Raster Support */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('raster')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">Can I convert raster imagery?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['raster'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['raster'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>
                            Not yet—GeoConverter focuses on <strong className="text-zinc-200">vector formats</strong> (points, lines, polygons).
                          </p>
                          <p className="text-xs text-zinc-400">
                            Common raster formats such as GeoTIFF or JPEG2000 are not loaded in the browser build of GDAL for performance reasons.
                            If you need raster reprojection or tiling, use desktop GDAL/OGR or cloud tooling, then bring the derived vectors back here.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* FAQ: Offline Usage */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq('offline')}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
                      >
                        <span className="font-semibold text-zinc-200">Does GeoConverter work offline?</span>
                        <ChevronDownIcon className={`w-5 h-5 text-emerald-400 transition-transform ${openFaq['offline'] ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq['offline'] && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-zinc-300 border-t border-zinc-800 pt-3">
                          <p>
                            After the app loads once, all conversions happen locally, so you can disconnect and keep working.
                          </p>
                          <ul className="text-xs text-zinc-400 space-y-1">
                            <li>• Initial load requires internet to download the WebAssembly bundle.</li>
                            <li>• Refreshing the page while offline works as long as the assets remain in your browser cache.</li>
                            <li>• Feedback form still need a connection.</li>
                          </ul>
                          <p className="text-xs text-zinc-400">
                            💡 Add GeoConverter as a progressive web app (PWA) to pin it offline on supported browsers.
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
