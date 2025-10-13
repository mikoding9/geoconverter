#!/usr/bin/env node
/**
 * Helper script to check and generate missing fixture files
 *
 * This script checks which fixture files are missing and provides
 * instructions for generating them using GDAL or the web application.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIXTURES = [
  { name: 'sample.geojson', format: 'GeoJSON', type: 'text' },
  { name: 'sample-shapefile.zip', format: 'Shapefile', type: 'binary' },
  { name: 'sample.gpkg', format: 'GeoPackage', type: 'binary' },
  { name: 'sample.kml', format: 'KML', type: 'text' },
  { name: 'sample.gpx', format: 'GPX', type: 'text' },
  { name: 'sample.gml', format: 'GML', type: 'text' },
  { name: 'sample.fgb', format: 'FlatGeobuf', type: 'binary' },
  { name: 'sample.csv', format: 'CSV', type: 'text' },
  { name: 'sample.pmtiles', format: 'PMTiles', type: 'binary' },
];

const fixturesDir = __dirname;

console.log('🔍 Checking test fixtures...\n');

let allPresent = true;
const missingFiles = [];

REQUIRED_FIXTURES.forEach(fixture => {
  const filePath = path.join(fixturesDir, fixture.name);
  const exists = fs.existsSync(filePath);

  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${fixture.name} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log(`❌ ${fixture.name} - MISSING`);
    missingFiles.push(fixture);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('\n✨ All fixture files are present!');
  console.log('You can run the tests with: pnpm run e2e:dev');
} else {
  console.log('\n⚠️  Some fixture files are missing. Here\'s how to generate them:\n');

  console.log('Option 1: Using the GeoConverter web application');
  console.log('------------------------------------------------');
  console.log('1. Start dev server: pnpm run dev');
  console.log('2. Open http://localhost:5173');
  console.log('3. Upload sample.geojson');
  console.log('4. Convert to each missing format and save to e2e/fixtures/\n');

  console.log('Missing files to generate:');
  missingFiles.forEach(fixture => {
    console.log(`   - ${fixture.name} (${fixture.format})`);
  });

  console.log('\nOption 2: Using GDAL command line (if installed)');
  console.log('------------------------------------------------');
  console.log('cd e2e/fixtures');

  missingFiles.forEach(fixture => {
    if (fixture.type === 'binary') {
      switch (fixture.format) {
        case 'Shapefile':
          console.log('ogr2ogr -f "ESRI Shapefile" temp.shp sample.geojson');
          console.log('zip sample-shapefile.zip temp.*');
          console.log('rm temp.*');
          break;
        case 'GeoPackage':
          console.log('ogr2ogr -f "GPKG" sample.gpkg sample.geojson');
          break;
        case 'FlatGeobuf':
          console.log('ogr2ogr -f "FlatGeobuf" sample.fgb sample.geojson');
          break;
        case 'PMTiles':
          console.log('ogr2ogr -f "PMTiles" sample.pmtiles sample.geojson');
          break;
      }
    }
  });

  console.log('\nAfter generating all files, run this script again to verify.');
}

process.exit(allPresent ? 0 : 1);
