# GeoConverter Changelog

All notable changes to GeoConverter will be documented in this file.

## 1.0.1 - 2025-01-13

### Added
- End-to-end test suite with Playwright
- Test fixtures for GeoJSON and KML conversion
- Advanced processing options:
  - Geometry simplification with Douglas-Peucker algorithm
  - Skip failures option for robust processing
  - Make valid option for automatic geometry repair
  - Explode collections for splitting GeometryCollections
  - Preserve FID option for stable feature references
  - Keep Z dimension control
- Format-specific options:
  - GeoJSON coordinate precision control (5-10 decimal places)
  - CSV geometry mode (WKT or X/Y columns)
- Data filtering capabilities:
  - Geometry type filtering (Point, LineString, Polygon, etc.)
  - Attribute filtering with SQL-like WHERE clauses
  - Field selection for optimized output
- CRS transformation with custom PROJ string support
- Auto-detection of input format from file extension
- Smart output format suggestions

### Changed
- Refactored conversion logic for more efficient processing
- Updated UI with collapsible advanced options section
- Improved error handling and user feedback
- Enhanced documentation with comprehensive feature list

### Fixed
- Shapefile output for zipped archives
- KML and GeoJSON bidirectional conversion
- Test file extension (.js to .cjs for ES module compatibility)

## 1.0.0 - 2025-01-10

### Added
- Initial release of GeoConverter
- Support for 9 geospatial formats:
  - GeoJSON
  - Shapefile (ZIP)
  - GeoPackage
  - KML
  - GPX
  - GML
  - FlatGeobuf
  - CSV
  - Parquet
- Browser-based conversion using GDAL/OGR via WebAssembly
- React 19 + Vite + Tailwind CSS v4 modern stack
- Dark-themed, animated UI with Motion
- File upload with drag-and-drop support
- Format-to-format conversion with download
- Privacy-first: all processing in-browser
- Built-in optimizations:
  - Shapefile geometry type splitting
  - GeoJSON bbox generation
  - GeoPackage spatial indexing
  - UTF-8 encoding for Shapefiles
