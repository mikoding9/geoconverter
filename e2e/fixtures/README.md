# Test Fixtures

This directory contains sample geospatial files for testing all 9 supported formats.

## Files

### Text-based formats (manually created):
- `sample.geojson` - GeoJSON sample with Point, LineString, and Polygon
- `sample.kml` - KML sample with placemarks
- `sample.gpx` - GPX sample with waypoints and tracks
- `sample.gml` - GML sample with features
- `sample.csv` - CSV sample with WKT geometries and X/Y columns

### Binary formats (need to be generated):
To generate the binary format fixtures, you can use the application itself:

1. **sample-shapefile.zip**: Convert `sample.geojson` to Shapefile using the app
2. **sample.gpkg**: Convert `sample.geojson` to GeoPackage using the app
3. **sample.fgb**: Convert `sample.geojson` to FlatGeobuf using the app
4. **sample.pmtiles**: Convert `sample.geojson` to PMTiles using the app

### Quick generation steps:
1. Start the dev server: `pnpm run dev`
2. Open http://localhost:5173
3. Upload `sample.geojson`
4. Convert to each binary format and save to this directory
5. Rename files to match the expected names above

Alternatively, use GDAL/OGR command line tools:
```bash
# From the e2e/fixtures directory
ogr2ogr -f "ESRI Shapefile" sample.shp sample.geojson
zip sample-shapefile.zip sample.*

ogr2ogr -f "GPKG" sample.gpkg sample.geojson
ogr2ogr -f "FlatGeobuf" sample.fgb sample.geojson
ogr2ogr -f "PMTiles" sample.pmtiles sample.geojson
```

## Coordinates
All samples use coordinates around Jakarta, Indonesia:
- Center: 106.8456°E, 6.2088°S (WGS84)
