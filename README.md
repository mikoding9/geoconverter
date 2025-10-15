# GeoConverter

**A browser-based geospatial file converter powered by GDAL/OGR and WebAssembly**

Transform geospatial vector data between various formats directly in your browser - no server uploads required. All processing happens locally using WebAssembly for maximum privacy and performance.

## Features

- **30 Supported Formats**: GeoJSON, TopoJSON (input only), Shapefile, GeoPackage, KML, GPX, GML, FlatGeobuf, CSV, DXF, PMTiles, MBTiles, DGN, GeoJSONSeq, GeoRSS, Geoconcept, JML, JSON-FG, MapML, ODS, OGR GMT, PCIDSK, PDS4, S-57, SQLite, Selafin, VDV, VICAR, WAsP, XLSX, PGDump (output only)
- **CRS Transformation**: Reproject coordinates between different coordinate reference systems (EPSG codes and custom PROJ strings)
- **Advanced Processing Options**:
  - Geometry filtering by type (Point, LineString, Polygon, etc.)
  - Attribute filtering with SQL-like WHERE clauses
  - Field selection for optimized output
  - Geometry simplification (Douglas-Peucker algorithm)
  - Invalid geometry repair
  - Multi-geometry handling and explosion
  - 2D/3D coordinate dimension control
- **Format-Specific Optimizations**:
  - Shapefile: Automatic geometry type splitting with multi-promotion
  - GeoJSON: Configurable coordinate precision and bbox generation
  - GeoPackage: Spatial indexing
  - CSV: Flexible geometry output (WKT or X/Y columns)
- **Privacy-First**: All processing happens in your browser using WebAssembly
- **Modern UI**: Clean, dark-themed interface built with React and Tailwind CSS

## Technology Stack

- **GDAL/OGR**: Industry-standard geospatial library (via [@cpp.js/package-gdal](https://www.npmjs.com/package/@cpp.js/package-gdal))
- **WebAssembly**: Compiled C++ GDAL running natively in the browser
- **React 19**: Modern React with hooks
- **Vite**: Fast build tooling and dev server
- **Tailwind CSS v4**: Utility-first styling
- **Motion**: Smooth animations
- **Headless UI**: Accessible UI components

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Basic understanding of geospatial formats is helpful but not required

### Installation

Install the dependencies:

```bash
pnpm install
```

### Development

Start the dev server:

```bash
pnpm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build the app for production:

```bash
pnpm run build
```

Preview the production build:

```bash
pnpm run preview
```

### Testing

Run end-to-end tests:

```bash
# Development mode (with dev server)
pnpm run e2e:dev

# Production mode (with production build)
pnpm run e2e:prod
```

Note: Playwright browsers need to be installed first:
```bash
pnpm exec playwright install
```

## Usage

1. **Upload a file**: Drag and drop or click to select a geospatial file
2. **Select formats**: Input format is auto-detected, choose your desired output format
3. **Configure options** (optional): Expand "Advanced Options" to:
   - Transform coordinate systems
   - Filter features by geometry type or attributes
   - Simplify geometries
   - Customize format-specific settings
4. **Convert**: Click "Convert & Download" to process and download your file

## Supported Formats

| Format | Input | Output | Notes |
|--------|-------|--------|-------|
| GeoJSON | ✓ | ✓ | Configurable precision, bbox support |
| TopoJSON | ✓ | — | Topology-preserving boundary sharing (input only) |
| Shapefile (ZIP) | ✓ | ✓ | Auto geometry splitting, UTF-8 encoding |
| GeoPackage | ✓ | ✓ | SQLite-based, spatial indexing |
| KML | ✓ | ✓ | Google Earth format |
| GPX | ✓ | ✓ | GPS exchange format |
| GML | ✓ | ✓ | Geography Markup Language |
| FlatGeobuf | ✓ | ✓ | Cloud-optimized format |
| CSV | ✓ | ✓ | WKT or X/Y geometry modes |
| DXF | ✓ | ✓ | CAD-friendly exchange format |
| PMTiles | ✓ | ✓ | Cloud-optimized tiled format |
| MBTiles | ✓ | ✓ | SQLite-based tiles for offline use |
| DGN | ✓ | ✓ | MicroStation design file exchange |
| GeoJSONSeq | ✓ | ✓ | Newline-delimited GeoJSON text sequences |
| GeoRSS | ✓ | ✓ | Geotagged RSS/Atom feeds |
| Geoconcept (GXT) | ✓ | ✓ | Geoconcept GIS interchange |
| JML | ✓ | ✓ | JMap layer XML format |
| JSON-FG | ✓ | ✓ | OGC JSON Features and Geometries |
| MapML | ✓ | ✓ | Web-ready Map Markup Language |
| ODS | ✓ | ✓ | OpenDocument spreadsheet with vector data |
| OGR GMT | ✓ | ✓ | Generic Mapping Tools ASCII |
| PCIDSK | ✓ | ✓ | PCI Geomatics PIX container |
| PDS4 | ✓ | ✓ | NASA Planetary Data System 4 tables |
| S-57 | ✓ | ✓ | Electronic Navigational Chart exchange |
| SQLite | ✓ | ✓ | Lightweight database container |
| Selafin | ✓ | ✓ | TELEMAC SELAFIN hydrodynamic mesh |
| VDV | ✓ | ✓ | Public transport VDV-451 files |
| VICAR | ✓ | ✓ | NASA/JPL VICAR imagery container |
| WAsP | ✓ | ✓ | Wind Atlas Application Program maps |
| XLSX | ✓ | ✓ | Excel workbook export |
| PGDump | — | ✓ | PostGIS-compatible SQL dump (output only) |

## Project Structure

```
geoconverter/
├── src/
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   ├── components/          # Reusable UI components
│   └── native/              # C++/GDAL bindings (auto-generated)
├── e2e/                     # End-to-end tests
│   ├── conversion.spec.cjs  # Conversion test suite
│   └── fixtures/            # Test data files
├── public/                  # Static assets
└── index.html               # HTML entry point
```

## License

MIT

## Acknowledgments

Built with [Cpp.js](https://cpp.js.org) - enabling C++ libraries in JavaScript via WebAssembly. Powered by [GDAL/OGR](https://gdal.org) - the industry-standard geospatial data abstraction library.
