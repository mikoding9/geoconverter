# GeoConverter E2E Tests

Comprehensive end-to-end tests for all 9 supported geospatial formats using Playwright.

## Test Coverage

### Supported Formats (9 total)
1. **GeoJSON** (.geojson) - JSON-based geographic data format
2. **Shapefile** (.zip) - ESRI's industry-standard vector format
3. **GeoPackage** (.gpkg) - SQLite-based OGC standard
4. **KML** (.kml) - Google Earth/Maps format
5. **GPX** (.gpx) - GPS Exchange Format
6. **GML** (.gml) - Geography Markup Language (OGC)
7. **FlatGeobuf** (.fgb) - Cloud-native streaming format
8. **CSV** (.csv) - Comma-separated values with WKT/XY geometry
9. **PMTiles** (.pmtiles) - Cloud-optimized tiled format

## Test Files

### `all-formats.spec.cjs`
Complete test suite covering:
- ✅ Format-to-format conversions (30+ test cases)
- ✅ Format auto-detection (GeoJSON, Shapefile, KML)
- ✅ Advanced features (preview, advanced options)
- ✅ UI/UX elements (privacy message, sidebars, buttons)
- ✅ File validation (magic bytes, structure checks)

## Setup

### Prerequisites
```bash
# Install dependencies
pnpm install

# Install Playwright browsers (first time only)
pnpm exec playwright install
```

### Generate Test Fixtures
Before running tests, ensure all fixture files exist:

```bash
# Check which fixtures are missing
node e2e/fixtures/generate-fixtures.js

# Generate missing fixtures using the app:
# 1. Start dev server
pnpm run dev

# 2. Open http://localhost:5173
# 3. Convert sample.geojson to each missing format
# 4. Save files to e2e/fixtures/ with correct names
```

See [fixtures/README.md](./fixtures/README.md) for detailed instructions.

## Running Tests

### Development Mode (with dev server)
```bash
# Run all tests
pnpm run e2e:dev

# Run specific test file
pnpm exec playwright test all-formats.spec.cjs --config playwright.dev.config.cjs

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed --config playwright.dev.config.cjs

# Run tests in UI mode (interactive)
pnpm exec playwright test --ui --config playwright.dev.config.cjs

# Run specific test by name
pnpm exec playwright test -g "should convert GeoJSON to KML" --config playwright.dev.config.cjs
```

### Production Mode (with build)
```bash
# Build first
pnpm run build

# Run tests against production build
pnpm run e2e:prod
```

### Debug Mode
```bash
# Debug a specific test
pnpm exec playwright test --debug -g "should convert GeoJSON" --config playwright.dev.config.cjs

# Show browser and slow down actions
pnpm exec playwright test --headed --slow-mo=1000 --config playwright.dev.config.cjs
```

## Test Structure

### Test Organization
```
all-formats.spec.cjs
├── 1. GeoJSON Format (8 tests)
│   ├── GeoJSON → Shapefile
│   ├── GeoJSON → GeoPackage
│   ├── GeoJSON → KML
│   ├── GeoJSON → GPX
│   ├── GeoJSON → GML
│   ├── GeoJSON → FlatGeobuf
│   ├── GeoJSON → CSV
│   └── GeoJSON → PMTiles
├── 2. Shapefile Format (3 tests)
├── 3. GeoPackage Format (3 tests)
├── 4. KML Format (3 tests)
├── 5. GPX Format (3 tests)
├── 6. GML Format (3 tests)
├── 7. FlatGeobuf Format (3 tests)
├── 8. CSV Format (3 tests)
├── 9. PMTiles Format (3 tests)
├── Format Auto-Detection (3 tests)
├── Advanced Features (2 tests)
└── UI/UX Tests (4 tests)
```

### Helper Functions
The test suite includes reusable helper functions:
- `performConversion()` - Upload file and perform conversion
- `verifyDownload()` - Verify downloaded file name and extension
- `saveAndReadDownload()` - Save download and verify file exists
- `cleanupDownload()` - Remove downloaded files after test

## Validation Checks

Each conversion test validates:
1. ✅ Download completes successfully
2. ✅ File has correct extension
3. ✅ File size > 0 bytes
4. ✅ Format-specific validation:
   - **JSON formats**: Parse and check structure
   - **XML formats**: Check for XML declaration and root element
   - **Binary formats**: Check magic bytes or file headers
   - **ZIP files**: Verify ZIP signature

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Generate fixtures
        run: |
          pnpm run dev &
          sleep 10
          node e2e/fixtures/generate-fixtures.js || true

      - name: Run E2E tests
        run: pnpm run e2e:dev

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Failing with Timeout
- Increase timeout in test config: `timeout: 60 * 1000`
- WASM initialization can be slow on first load
- Check if dev server is running properly

### Download Not Starting
- Verify file input is being set correctly
- Check that GDAL has initialized (wait for version badge)
- Ensure convert button is enabled before clicking

### File Format Validation Failing
- Check fixture file is valid and not corrupted
- Verify file extension matches expected format
- Review GDAL error messages in browser console

### Missing Fixtures
- Run `node e2e/fixtures/generate-fixtures.js` to check status
- Generate missing files using the app or GDAL CLI
- Ensure files are named exactly as expected

## Test Maintenance

### Adding New Format Tests
1. Add fixture file to `e2e/fixtures/`
2. Update `generate-fixtures.js` with new format
3. Add test describe block in `all-formats.spec.cjs`
4. Add conversion tests for new format
5. Update this README

### Updating Existing Tests
- Keep helper functions DRY
- Maintain consistent test structure across formats
- Update validation logic if format specifications change
- Add format-specific checks where needed

## Performance

### Test Execution Time
- Single test: ~5-10 seconds
- Full suite: ~5-10 minutes (30+ tests)
- Parallel execution: Enabled by default
- CI execution: Sequential (workers: 1)

### Optimization Tips
- Run specific test suites during development
- Use `--headed` only when debugging
- Enable parallel execution for faster results
- Cache Playwright browsers in CI

## Resources

- [Playwright Documentation](https://playwright.dev)
- [GDAL Vector Formats](https://gdal.org/drivers/vector/index.html)
- [GeoJSON Specification](https://geojson.org)
- [OGC Standards](https://www.ogc.org/standards)
