// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('GeoConverter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for GDAL to initialize
    await expect(page.locator('text=GDAL Version')).toBeVisible({ timeout: 30000 });
  });

  test('should display the app title and GDAL version', async ({ page }) => {
    await expect(page.locator('text=GeoConverter')).toBeVisible();
    await expect(page.locator('text=Convert Vector Files')).toBeVisible();
    await expect(page.locator('text=/GDAL Version/')).toBeVisible();
  });

  test('should have file upload area', async ({ page }) => {
    await expect(page.locator('text=Choose a file or drag it here')).toBeVisible();
  });

  test('should have format selectors', async ({ page }) => {
    const inputFormatSelect = page.locator('select').first();
    const outputFormatSelect = page.locator('select').last();

    await expect(inputFormatSelect).toBeVisible();
    await expect(outputFormatSelect).toBeVisible();

    // Check that GeoJSON and KML are available
    const inputOptions = await inputFormatSelect.locator('option').allTextContents();
    const outputOptions = await outputFormatSelect.locator('option').allTextContents();

    expect(inputOptions).toContain('GeoJSON');
    expect(inputOptions).toContain('KML');
    expect(outputOptions).toContain('GeoJSON');
    expect(outputOptions).toContain('KML');
  });

  test('convert button should be disabled without file', async ({ page }) => {
    const convertButton = page.locator('button:has-text("Convert & Download")');
    await expect(convertButton).toBeDisabled();
  });

  test('should convert GeoJSON to KML', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Select input and output formats
    await page.locator('select').first().selectOption('geojson');
    await page.locator('select').last().selectOption('kml');

    // Upload GeoJSON file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample.geojson');
    await fileInput.setInputFiles(filePath);

    // Verify file is selected
    await expect(page.locator('text=sample.geojson')).toBeVisible();

    // Wait for convert button to be enabled
    const convertButton = page.locator('button:has-text("Convert & Download")');
    await expect(convertButton).toBeEnabled();

    // Click convert button
    await convertButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download filename
    expect(download.suggestedFilename()).toBe('sample.kml');

    // Save and verify the downloaded file exists and has content
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);

    const fileExists = fs.existsSync(downloadPath);
    expect(fileExists).toBeTruthy();

    const fileSize = fs.statSync(downloadPath).size;
    expect(fileSize).toBeGreaterThan(0);

    // Read and verify KML content
    const content = fs.readFileSync(downloadPath, 'utf-8');
    expect(content).toContain('<?xml version="1.0"');
    expect(content).toContain('<kml');
    expect(content).toContain('Sample Point');

    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should convert KML to GeoJSON', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Select input and output formats
    await page.locator('select').first().selectOption('kml');
    await page.locator('select').last().selectOption('geojson');

    // Upload KML file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample.kml');
    await fileInput.setInputFiles(filePath);

    // Verify file is selected
    await expect(page.locator('text=sample.kml')).toBeVisible();

    // Wait for convert button to be enabled
    const convertButton = page.locator('button:has-text("Convert & Download")');
    await expect(convertButton).toBeEnabled();

    // Click convert button
    await convertButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download filename
    expect(download.suggestedFilename()).toBe('sample.geojson');

    // Save and verify the downloaded file
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);

    const fileExists = fs.existsSync(downloadPath);
    expect(fileExists).toBeTruthy();

    const fileSize = fs.statSync(downloadPath).size;
    expect(fileSize).toBeGreaterThan(0);

    // Read and verify GeoJSON content
    const content = fs.readFileSync(downloadPath, 'utf-8');
    const geojson = JSON.parse(content);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toBeDefined();
    expect(geojson.features.length).toBeGreaterThan(0);

    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should show file size after upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample.geojson');
    await fileInput.setInputFiles(filePath);

    // Should show file size in KB
    await expect(page.locator('text=/\\d+\\.\\d+ KB/')).toBeVisible();
  });

  test('should display privacy message', async ({ page }) => {
    await expect(page.locator('text=/All processing happens in your browser/')).toBeVisible();
  });
});
