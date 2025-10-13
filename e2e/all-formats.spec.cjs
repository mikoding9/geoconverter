// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Comprehensive test suite for all 10 supported formats:
 * 1. GeoJSON
 * 2. Shapefile
 * 3. GeoPackage
 * 4. KML
 * 5. GPX
 * 6. GML
 * 7. FlatGeobuf
 * 8. CSV
 * 9. PMTiles
 * 10. MBTiles
 */

test.describe('GeoConverter - All Format Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for GDAL to initialize with a longer timeout for WebAssembly
    await expect(page.locator('text=/GDAL Version/')).toBeVisible({ timeout: 30000 });
  });

  // Helper function to perform conversion
  async function performConversion(page, inputFormat, outputFormat, fixtureFilename) {
    const downloadPromise = page.waitForEvent('download');

    // Select input format
    const inputFormatSelect = page.locator('label:has-text("Input Format")').locator('..').locator('select');
    await inputFormatSelect.selectOption(inputFormat);

    // Select output format
    const outputFormatSelect = page.locator('label:has-text("Output Format")').locator('..').locator('select');
    await outputFormatSelect.selectOption(outputFormat);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', fixtureFilename);
    await fileInput.setInputFiles(filePath);

    // Verify file is selected
    await expect(page.locator(`text=${fixtureFilename}`)).toBeVisible();

    // Wait for convert button to be enabled
    const convertButton = page.locator('button:has-text("Convert & Download")');
    await expect(convertButton).toBeEnabled({ timeout: 10000 });

    // Click convert button
    await convertButton.click();

    // Wait for download
    const download = await downloadPromise;

    return download;
  }

  // Helper function to verify download
  function verifyDownload(download, expectedFilename, expectedExtension) {
    expect(download.suggestedFilename()).toContain(expectedExtension);
    return download;
  }

  // Helper function to save and read download
  async function saveAndReadDownload(download) {
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());

    // Ensure downloads directory exists
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    await download.saveAs(downloadPath);

    const fileExists = fs.existsSync(downloadPath);
    expect(fileExists).toBeTruthy();

    const fileSize = fs.statSync(downloadPath).size;
    expect(fileSize).toBeGreaterThan(0);

    return downloadPath;
  }

  // Helper function to cleanup download
  function cleanupDownload(downloadPath) {
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  }

  test.describe('1. GeoJSON Format', () => {
    test('should convert GeoJSON to Shapefile', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'shapefile', 'sample.geojson');
      verifyDownload(download, 'sample', '.zip');
      const downloadPath = await saveAndReadDownload(download);

      // Verify it's a valid ZIP file
      const content = fs.readFileSync(downloadPath);
      expect(content[0]).toBe(0x50); // ZIP magic number 'P'
      expect(content[1]).toBe(0x4B); // ZIP magic number 'K'

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to GeoPackage', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'geopackage', 'sample.geojson');
      verifyDownload(download, 'sample', '.gpkg');
      const downloadPath = await saveAndReadDownload(download);

      // Verify it's a SQLite database (GeoPackage is SQLite-based)
      const content = fs.readFileSync(downloadPath, 'utf-8', { encoding: 'utf-8' });
      expect(content).toContain('SQLite format');

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to KML', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'kml', 'sample.geojson');
      verifyDownload(download, 'sample', '.kml');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<?xml version="1.0"');
      expect(content).toContain('<kml');

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to GPX', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'gpx', 'sample.geojson');
      verifyDownload(download, 'sample', '.gpx');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<?xml version="1.0"');
      expect(content).toContain('<gpx');

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to GML', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'gml', 'sample.geojson');
      verifyDownload(download, 'sample', '.gml');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<?xml version="1.0"');
      expect(content).toContain('gml');

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to FlatGeobuf', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'flatgeobuf', 'sample.geojson');
      verifyDownload(download, 'sample', '.fgb');
      const downloadPath = await saveAndReadDownload(download);

      // FlatGeobuf has a magic header
      const content = fs.readFileSync(downloadPath);
      expect(content.length).toBeGreaterThan(8);

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to CSV', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'csv', 'sample.geojson');
      verifyDownload(download, 'sample', '.csv');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      // CSV should have headers
      expect(content).toMatch(/[A-Za-z_]+,[A-Za-z_]+/);

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to PMTiles', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'pmtiles', 'sample.geojson');
      verifyDownload(download, 'sample', '.pmtiles');
      const downloadPath = await saveAndReadDownload(download);

      // PMTiles files have specific magic bytes
      const content = fs.readFileSync(downloadPath);
      expect(content.length).toBeGreaterThan(4);

      cleanupDownload(downloadPath);
    });

    test('should convert GeoJSON to MBTiles', async ({ page }) => {
      const download = await performConversion(page, 'geojson', 'mbtiles', 'sample.geojson');
      verifyDownload(download, 'sample', '.mbtiles');
      const downloadPath = await saveAndReadDownload(download);

      // MBTiles is SQLite-based
      const content = fs.readFileSync(downloadPath);
      expect(content.length).toBeGreaterThan(4);

      cleanupDownload(downloadPath);
    });
  });

  test.describe('2. Shapefile Format', () => {
    test('should convert Shapefile to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'shapefile', 'geojson', 'sample-shapefile.zip');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toBeDefined();

      cleanupDownload(downloadPath);
    });

    test('should convert Shapefile to GeoPackage', async ({ page }) => {
      const download = await performConversion(page, 'shapefile', 'geopackage', 'sample-shapefile.zip');
      verifyDownload(download, 'sample', '.gpkg');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });

    test('should convert Shapefile to KML', async ({ page }) => {
      const download = await performConversion(page, 'shapefile', 'kml', 'sample-shapefile.zip');
      verifyDownload(download, 'sample', '.kml');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<kml');

      cleanupDownload(downloadPath);
    });
  });

  test.describe('3. GeoPackage Format', () => {
    test('should convert GeoPackage to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'geopackage', 'geojson', 'sample.gpkg');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert GeoPackage to Shapefile', async ({ page }) => {
      const download = await performConversion(page, 'geopackage', 'shapefile', 'sample.gpkg');
      verifyDownload(download, 'sample', '.zip');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });

    test('should convert GeoPackage to CSV', async ({ page }) => {
      const download = await performConversion(page, 'geopackage', 'csv', 'sample.gpkg');
      verifyDownload(download, 'sample', '.csv');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);

      cleanupDownload(downloadPath);
    });
  });

  test.describe('4. KML Format', () => {
    test('should convert KML to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'kml', 'geojson', 'sample.kml');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert KML to Shapefile', async ({ page }) => {
      const download = await performConversion(page, 'kml', 'shapefile', 'sample.kml');
      verifyDownload(download, 'sample', '.zip');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });

    test('should convert KML to GPX', async ({ page }) => {
      const download = await performConversion(page, 'kml', 'gpx', 'sample.kml');
      verifyDownload(download, 'sample', '.gpx');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<gpx');

      cleanupDownload(downloadPath);
    });
  });

  test.describe('5. GPX Format', () => {
    test('should convert GPX to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'gpx', 'geojson', 'sample.gpx');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert GPX to KML', async ({ page }) => {
      const download = await performConversion(page, 'gpx', 'kml', 'sample.gpx');
      verifyDownload(download, 'sample', '.kml');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<kml');

      cleanupDownload(downloadPath);
    });

    test('should convert GPX to CSV', async ({ page }) => {
      const download = await performConversion(page, 'gpx', 'csv', 'sample.gpx');
      verifyDownload(download, 'sample', '.csv');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });
  });

  test.describe('6. GML Format', () => {
    test('should convert GML to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'gml', 'geojson', 'sample.gml');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert GML to Shapefile', async ({ page }) => {
      const download = await performConversion(page, 'gml', 'shapefile', 'sample.gml');
      verifyDownload(download, 'sample', '.zip');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });

    test('should convert GML to GeoPackage', async ({ page }) => {
      const download = await performConversion(page, 'gml', 'geopackage', 'sample.gml');
      verifyDownload(download, 'sample', '.gpkg');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });
  });

  test.describe('7. FlatGeobuf Format', () => {
    test('should convert FlatGeobuf to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'flatgeobuf', 'geojson', 'sample.fgb');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert FlatGeobuf to Shapefile', async ({ page }) => {
      const download = await performConversion(page, 'flatgeobuf', 'shapefile', 'sample.fgb');
      verifyDownload(download, 'sample', '.zip');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });

    test('should convert FlatGeobuf to GeoPackage', async ({ page }) => {
      const download = await performConversion(page, 'flatgeobuf', 'geopackage', 'sample.fgb');
      verifyDownload(download, 'sample', '.gpkg');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });
  });

  test.describe('8. CSV Format', () => {
    test('should convert CSV to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'csv', 'geojson', 'sample.csv');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert CSV to Shapefile', async ({ page }) => {
      const download = await performConversion(page, 'csv', 'shapefile', 'sample.csv');
      verifyDownload(download, 'sample', '.zip');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });

    test('should convert CSV to KML', async ({ page }) => {
      const download = await performConversion(page, 'csv', 'kml', 'sample.csv');
      verifyDownload(download, 'sample', '.kml');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content).toContain('<kml');

      cleanupDownload(downloadPath);
    });
  });

  test.describe('9. PMTiles Format', () => {
    test('should convert PMTiles to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'pmtiles', 'geojson', 'sample.pmtiles');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert PMTiles to CSV', async ({ page }) => {
      const download = await performConversion(page, 'pmtiles', 'csv', 'sample.pmtiles');
      verifyDownload(download, 'sample', '.csv');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);

      cleanupDownload(downloadPath);
    });

    test('should convert PMTiles to GeoPackage', async ({ page }) => {
      const download = await performConversion(page, 'pmtiles', 'geopackage', 'sample.pmtiles');
      verifyDownload(download, 'sample', '.gpkg');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });
  });

  test.describe('10. MBTiles Format', () => {
    test('should convert MBTiles to GeoJSON', async ({ page }) => {
      const download = await performConversion(page, 'mbtiles', 'geojson', 'sample.mbtiles');
      verifyDownload(download, 'sample', '.geojson');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      const geojson = JSON.parse(content);
      expect(geojson.type).toBe('FeatureCollection');

      cleanupDownload(downloadPath);
    });

    test('should convert MBTiles to CSV', async ({ page }) => {
      const download = await performConversion(page, 'mbtiles', 'csv', 'sample.mbtiles');
      verifyDownload(download, 'sample', '.csv');
      const downloadPath = await saveAndReadDownload(download);

      const content = fs.readFileSync(downloadPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);

      cleanupDownload(downloadPath);
    });

    test('should convert MBTiles to GeoPackage', async ({ page }) => {
      const download = await performConversion(page, 'mbtiles', 'geopackage', 'sample.mbtiles');
      verifyDownload(download, 'sample', '.gpkg');
      const downloadPath = await saveAndReadDownload(download);
      cleanupDownload(downloadPath);
    });
  });

  test.describe('Format Auto-Detection', () => {
    test('should auto-detect GeoJSON format from .geojson file', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const filePath = path.join(__dirname, 'fixtures', 'sample.geojson');
      await fileInput.setInputFiles(filePath);

      // Check that "auto-detected" text appears
      await expect(page.locator('text=(auto-detected)')).toBeVisible();

      // Check that input format is set to geojson
      const inputFormatSelect = page.locator('label:has-text("Input Format")').locator('..').locator('select');
      await expect(inputFormatSelect).toHaveValue('geojson');
    });

    test('should auto-detect Shapefile format from .zip file', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const filePath = path.join(__dirname, 'fixtures', 'sample-shapefile.zip');
      await fileInput.setInputFiles(filePath);

      // Check that "auto-detected" text appears
      await expect(page.locator('text=(auto-detected)')).toBeVisible();

      // Check that input format is set to shapefile
      const inputFormatSelect = page.locator('label:has-text("Input Format")').locator('..').locator('select');
      await expect(inputFormatSelect).toHaveValue('shapefile');
    });

    test('should auto-detect KML format from .kml file', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const filePath = path.join(__dirname, 'fixtures', 'sample.kml');
      await fileInput.setInputFiles(filePath);

      await expect(page.locator('text=(auto-detected)')).toBeVisible();

      const inputFormatSelect = page.locator('label:has-text("Input Format")').locator('..').locator('select');
      await expect(inputFormatSelect).toHaveValue('kml');
    });
  });

  test.describe('Advanced Features', () => {
    test('should display preview button after file upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const filePath = path.join(__dirname, 'fixtures', 'sample.geojson');
      await fileInput.setInputFiles(filePath);

      // Preview button should be visible
      await expect(page.locator('button:has-text("Preview")')).toBeVisible();
    });

    test('should show advanced options when expanded', async ({ page }) => {
      // Click to expand advanced options
      await page.locator('button:has-text("Advanced Options")').click();

      // Check that advanced options are visible
      await expect(page.locator('text=Coordinate Reference System (CRS) Transformation')).toBeVisible();
      await expect(page.locator('text=Processing Options')).toBeVisible();
      await expect(page.locator('text=Data Filtering')).toBeVisible();
    });

    test('should display all 10 supported formats in format lists', async ({ page }) => {
      const inputFormatSelect = page.locator('label:has-text("Input Format")').locator('..').locator('select');
      const outputFormatSelect = page.locator('label:has-text("Output Format")').locator('..').locator('select');

      const expectedFormats = [
        'GeoJSON',
        'Shapefile',
        'GeoPackage',
        'KML',
        'GPX',
        'GML',
        'FlatGeobuf',
        'CSV',
        'PMTiles',
        'MBTiles'
      ];

      // Check input formats
      const inputOptions = await inputFormatSelect.locator('option').allTextContents();
      for (const format of expectedFormats) {
        expect(inputOptions).toContain(format);
      }

      // Check output formats
      const outputOptions = await outputFormatSelect.locator('option').allTextContents();
      for (const format of expectedFormats) {
        expect(outputOptions).toContain(format);
      }
    });
  });

  test.describe('UI/UX Tests', () => {
    test('should show privacy message', async ({ page }) => {
      await expect(page.locator('text=/100% client-side processing/')).toBeVisible();
    });

    test('should display supported formats sidebar', async ({ page }) => {
      await expect(page.locator('text=Supported Formats')).toBeVisible();
    });

    test('should display feedback form', async ({ page }) => {
      await expect(page.locator('text=Send Feedback')).toBeVisible();
    });

    test('should have disabled convert button without file', async ({ page }) => {
      const convertButton = page.locator('button:has-text("Convert & Download")');
      await expect(convertButton).toBeDisabled();
    });
  });
});
