import { motion } from 'motion/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Map, { Source, Layer } from 'react-map-gl/maplibre'

export function PreviewModal({
  isOpen,
  onClose,
  selectedFile,
  previewData,
  inputFormat,
  showBboxReprojectionFailure
}) {
  if (!isOpen || !selectedFile) return null

  const formattedFeatureCount =
    previewData?.featureCount !== undefined
      ? typeof previewData.featureCount === 'number'
        ? previewData.featureCount.toLocaleString()
        : previewData.featureCount
      : 'Loading...'

  const hasProperties =
    Boolean(previewData?.properties) && previewData.properties.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900/95 border border-zinc-700/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Data Preview</h3>
            <p className="text-sm text-zinc-400 mt-0.5">{selectedFile.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {previewData?.bbox && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <span>🗺️</span> Location Preview
              </h4>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden aspect-video">
                <Map
                  initialViewState={{
                    bounds: [
                      [previewData.bbox[0], previewData.bbox[1]],
                      [previewData.bbox[2], previewData.bbox[3]]
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
                    {previewData.bbox.map((value) => value.toFixed(6)).join(', ')}
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
                      {previewData.bboxOriginal.map((value) => value.toFixed(2)).join(', ')}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

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
                  <p className="text-sm text-zinc-300 font-medium">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Feature Count</p>
                  <p className="text-sm text-zinc-300 font-medium">
                    {formattedFeatureCount}
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
                    {previewData?.layers
                      ? `${previewData.layers} layer${previewData.layers > 1 ? 's' : ''}`
                      : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <span>🏷️</span> Data Attributes (First Feature)
            </h4>
            {hasProperties ? (
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
  )
}
