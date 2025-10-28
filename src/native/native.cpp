#include "native.h"
#include <gdal.h>
#include <gdal_priv.h>
#include <ogr_api.h>
#include <ogrsf_frmts.h>
#include <ogr_spatialref.h>
#include <cpl_vsi.h>
#include <cpl_string.h>
#include <cpl_error.h>
#include <gdalwarper.h>
#include <gdal_utils.h>
#include <algorithm>
#include <memory>
#include <vector>
#include <string>

std::string Native::getGdalInfo() {
    GDALAllRegister();

    std::string info = "GDAL Version: ";
    info += GDALVersionInfo("VERSION_NUM");
    info += " (";
    info += GDALVersionInfo("RELEASE_NAME");
    info += ")";

    return info;
}

// ----------------- helpers -----------------
static std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c){ return std::tolower(c); });
    return s;
}

// Escape special characters for JSON string values
static std::string escapeJsonString(const std::string& input) {
    std::string output;
    output.reserve(input.size());

    for (char c : input) {
        switch (c) {
            case '"':  output += "\\\""; break;
            case '\\': output += "\\\\"; break;
            case '\b': output += "\\b"; break;
            case '\f': output += "\\f"; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default:
                if (c < 0x20) {
                    // Control characters
                    char buf[7];
                    snprintf(buf, sizeof(buf), "\\u%04x", (unsigned char)c);
                    output += buf;
                } else {
                    output += c;
                }
                break;
        }
    }

    return output;
}

static thread_local std::string g_lastError;
static thread_local std::string g_lastInfo;

static void resetLastError() {
    g_lastError.clear();
    g_lastInfo.clear();
    CPLErrorReset();
}

static void recordErrorMessage(const char* msg) {
    if (msg && *msg) {
        g_lastError = msg;
    }
}

static void recordInfoMessage(const char* msg) {
    if (msg && *msg) {
        g_lastInfo = msg;
    }
}

static void ensureLastErrorMessage() {
    if (!g_lastError.empty()) {
        return;
    }
    const char* cplMsg = CPLGetLastErrorMsg();
    if (cplMsg && *cplMsg) {
        g_lastError = cplMsg;
    } else if (!g_lastInfo.empty()) {
        g_lastError = g_lastInfo;
    }
}

static std::string getDriverNameFromFormat(const std::string& format) {
    auto f = toLower(format);
    if (f == "geojson")     return "GeoJSON";
    if (f == "topojson")    return "TopoJSON";
    if (f == "shapefile")   return "ESRI Shapefile";
    if (f == "geopackage")  return "GPKG";
    if (f == "kml")         return "KML";
    if (f == "gpx")         return "GPX";
    if (f == "gml")         return "GML";
    if (f == "flatgeobuf")  return "FlatGeobuf";
    if (f == "csv")         return "CSV";
    if (f == "pmtiles")     return "PMTiles";
    if (f == "mbtiles")     return "MBTiles";
    if (f == "dxf")         return "DXF";
    if (f == "dgn")         return "DGN";
    if (f == "geojsonseq")  return "GeoJSONSeq";
    if (f == "georss")      return "GeoRSS";
    if (f == "geoconcept")  return "Geoconcept";
    if (f == "jml")         return "JML";
    if (f == "jsonfg")      return "JSONFG";
    if (f == "mapml")       return "MapML";
    if (f == "ods")         return "ODS";
    if (f == "ogr_gmt")     return "OGR_GMT";
    if (f == "pcidsk")      return "PCIDSK";
    if (f == "pds4")        return "PDS4";
    if (f == "s57")         return "S57";
    if (f == "sqlite")      return "SQLite";
    if (f == "selafin")     return "Selafin";
    if (f == "vdv")         return "VDV";
    if (f == "vicar")       return "VICAR";
    if (f == "wasp")        return "WAsP";
    if (f == "xlsx")        return "XLSX";
    if (f == "pgdump")      return "PGDump";
    return "GeoJSON";
}

static std::string getExtensionFromFormat(const std::string& format) {
    auto f = toLower(format);
    if (f == "geojson")     return ".geojson";
    if (f == "topojson")    return ".topojson";
    if (f == "shapefile")   return ".zip";      // we will return a ZIP containing the SHP set
    if (f == "geopackage")  return ".gpkg";
    if (f == "kml")         return ".kml";
    if (f == "gpx")         return ".gpx";
    if (f == "gml")         return ".gml";
    if (f == "flatgeobuf")  return ".fgb";
    if (f == "csv")         return ".csv";
    if (f == "pmtiles")     return ".pmtiles";
    if (f == "mbtiles")     return ".mbtiles";
    if (f == "dxf")         return ".dxf";
    if (f == "dgn")         return ".dgn";
    if (f == "geojsonseq")  return ".geojsonseq";
    if (f == "georss")      return ".georss";
    if (f == "geoconcept")  return ".gxt";
    if (f == "jml")         return ".jml";
    if (f == "jsonfg")      return ".jsonfg";
    if (f == "mapml")       return ".mapml";
    if (f == "ods")         return ".ods";
    if (f == "ogr_gmt")     return ".gmt";
    if (f == "pcidsk")      return ".pix";
    if (f == "pds4")        return ".pds4.xml";
    if (f == "s57")         return ".000";
    if (f == "sqlite")      return ".sqlite";
    if (f == "selafin")     return ".slf";
    if (f == "vdv")         return ".vdv";
    if (f == "vicar")       return ".vic";
    if (f == "wasp")        return ".map";
    if (f == "xlsx")        return ".xlsx";
    if (f == "pgdump")      return ".sql";
    return ".geojson";
}

// Simple error handler: capture both errors and warnings
static void ErrHandler(CPLErr classType, int, const char* msg) {
    if (classType == CE_Failure || classType == CE_Fatal) {
        recordErrorMessage(msg);
    } else if (classType == CE_Warning || classType == CE_Debug) {
        recordInfoMessage(msg);
    }
}

// find a .shp inside /vsizip//vsimem/xxx.zip (first match)
static std::string pickShpInsideZip(const std::string& zipVsi) {
    char** files = VSIReadDirRecursive(zipVsi.c_str());
    std::string shpPath;
    for (int i = 0; files && files[i]; i++) {
        std::string f = files[i];
        if (f.size() > 4 && toLower(f.substr(f.size()-4)) == ".shp") {
            shpPath = zipVsi + "/" + f; // e.g. /vsizip//vsimem/input.zip/folder/foo.shp
            break;
        }
    }
    CSLDestroy(files);
    return shpPath;
}

// small wrapper for GDALVectorTranslate
static GDALDataset* runVectorTranslate(GDALDataset* src, const std::string& dstPath, const std::vector<std::string>& argvVec) {
    std::vector<char*> argv; argv.reserve(argvVec.size()+1);
    for (auto& s : argvVec) argv.push_back(const_cast<char*>(s.c_str()));
    argv.push_back(nullptr);
    GDALVectorTranslateOptions* opts = GDALVectorTranslateOptionsNew(argv.data(), nullptr);
    GDALDataset* out = (GDALDataset*)GDALVectorTranslate(dstPath.c_str(), nullptr, 1, (GDALDatasetH*)&src, opts, nullptr);
    GDALVectorTranslateOptionsFree(opts);
    return out;
}

// count features of certain OGR_GEOMETRY categories in a layer
static GIntBig countGeomWhere(GDALDataset* ds, const std::string& layerName, const std::string& where) {
    std::string sql = "SELECT COUNT(*) FROM \"" + layerName + "\"";
    if (!where.empty()) sql += " WHERE " + where;
    OGRLayer* lyr = ds->ExecuteSQL(sql.c_str(), nullptr, nullptr);
    GIntBig cnt = 0;
    if (lyr) {
        OGRFeature* f = lyr->GetNextFeature();
        if (f) {
            // the COUNT(*) is at index 0
            cnt = f->GetFieldAsInteger64(0);
            OGRFeature::DestroyFeature(f);
        }
        ds->ReleaseResultSet(lyr);
    }
    return cnt;
}

// decide CRS args: transform or assign
// User-provided CRS always takes priority over file's embedded CRS
static void pushCrsArgs(std::vector<std::string>& args,
                        GDALDataset* src,
                        const std::string& sourceCrs,
                        const std::string& targetCrs)
{
    const bool haveSrc = !sourceCrs.empty();
    const bool haveDst = !targetCrs.empty();

    // Case 1: User specified both source and target CRS
    if (haveSrc && haveDst && sourceCrs != targetCrs) {
        // Transform: override file's CRS with user's source CRS, then reproject to target
        args.insert(args.end(), {"-s_srs", sourceCrs, "-t_srs", targetCrs});
        return;
    }

    // Case 2: User specified only source CRS (no target)
    if (haveSrc && !haveDst) {
        // Assign/override: tell GDAL the data is in this CRS (user knows better than auto-detect)
        args.insert(args.end(), {"-a_srs", sourceCrs});
        return;
    }

    // Case 3: User specified only target CRS (no source)
    if (haveDst && !haveSrc) {
        // Check if file has embedded CRS
        OGRLayer* L0 = src->GetLayerCount() > 0 ? src->GetLayer(0) : nullptr;
        OGRSpatialReference* srs = L0 ? L0->GetSpatialRef() : nullptr;

        if (srs == nullptr) {
            // No CRS in file: assign the target CRS
            args.insert(args.end(), {"-a_srs", targetCrs});
        } else {
            // File has CRS: transform from auto-detected to target
            args.insert(args.end(), {"-t_srs", targetCrs});
        }
    }

    // Case 4: No user CRS specified - let GDAL auto-detect (do nothing)
}

static void pushDriverLCO(std::vector<std::string>& args, const std::string& driver, int geojsonPrecision, const std::string& csvGeometryMode) {
    if (driver == "ESRI Shapefile") {
        args.insert(args.end(), {"-lco", "ENCODING=UTF-8"});
    } else if (driver == "GeoJSON" || driver == "TopoJSON") {
        args.insert(args.end(), {"-lco", "WRITE_BBOX=YES"});
        args.insert(args.end(), {"-lco", "COORDINATE_PRECISION=" + std::to_string(geojsonPrecision)});
    } else if (driver == "GPKG") {
        args.insert(args.end(), {"-lco", "SPATIAL_INDEX=YES"});
    } else if (driver == "CSV") {
        // CSV geometry mode: AS_WKT (default) or AS_XY
        if (csvGeometryMode == "XY") {
            args.insert(args.end(), {"-lco", "GEOMETRY=AS_XY"});
        } else {
            args.insert(args.end(), {"-lco", "GEOMETRY=AS_WKT"});
        }
    }
}

// where clauses for geometry families
static const char* WHERE_POINT       = "OGR_GEOMETRY='POINT'";
static const char* WHERE_MULTIPOINT  = "OGR_GEOMETRY='MULTIPOINT'";
static const char* WHERE_LINES       = "OGR_GEOMETRY='LINESTRING' OR OGR_GEOMETRY='MULTILINESTRING'";
static const char* WHERE_POLYS       = "OGR_GEOMETRY='POLYGON' OR OGR_GEOMETRY='MULTIPOLYGON'";

// optional single-family where for non-SHP outputs (user-provided filter)
static std::string whereFromFilter(const std::string& filter) {
    auto f = toLower(filter);
    if (f == "point" || f == "points") return WHERE_POINT;
    if (f == "multipoint" || f == "multi-point") return WHERE_MULTIPOINT;
    if (f == "line" || f == "lines" || f == "linestring") return WHERE_LINES;
    if (f == "polygon" || f == "polygons") return WHERE_POLYS;
    return std::string();
}

static bool transformExtentToWgs84(const OGREnvelope& extent,
                                   const std::string& sourceCrs,
                                   double& minX,
                                   double& minY,
                                   double& maxX,
                                   double& maxY,
                                   std::string& debugInfo)
{
    if (sourceCrs.empty()) {
        debugInfo += "Source CRS is empty; ";
        return false;
    }

    debugInfo += "Using source CRS: " + sourceCrs + "; ";

    // Quick check: if the CRS string indicates WGS84/EPSG:4326, skip transformation
    std::string lowerCrs = toLower(sourceCrs);
    if (lowerCrs == "epsg:4326" ||
        lowerCrs == "wgs84" ||
        lowerCrs == "wgs 84" ||
        lowerCrs.find("wgs84") != std::string::npos ||
        lowerCrs.find("wgs 84") != std::string::npos) {
        debugInfo += "Already WGS84 (detected from CRS string), skipping; ";
        return false;
    }

    OGRSpatialReference srcSrs;
    OGRErr err = srcSrs.SetFromUserInput(sourceCrs.c_str());
    if (err != OGRERR_NONE) {
        debugInfo += "SetFromUserInput failed (error " + std::to_string(err) + "); ";
        return false;
    }
    srcSrs.SetAxisMappingStrategy(OAMS_TRADITIONAL_GIS_ORDER);

    OGRSpatialReference wgs84;
    wgs84.SetWellKnownGeogCS("WGS84");
    wgs84.SetAxisMappingStrategy(OAMS_TRADITIONAL_GIS_ORDER);

    if (srcSrs.IsSame(&wgs84)) {
        debugInfo += "Already WGS84, skipping; ";
        return false;
    }

    struct SamplePoint {
        double x;
        double y;
    };

    const int steps = 8;
    std::vector<SamplePoint> points;
    points.reserve((steps + 1) * 4);
    auto addEdge = [&](double x0, double y0, double x1, double y1) {
        for (int i = 0; i <= steps; ++i) {
            double t = static_cast<double>(i) / steps;
            points.push_back({x0 + (x1 - x0) * t, y0 + (y1 - y0) * t});
        }
    };

    addEdge(extent.MinX, extent.MinY, extent.MaxX, extent.MinY); // bottom
    addEdge(extent.MaxX, extent.MinY, extent.MaxX, extent.MaxY); // right
    addEdge(extent.MaxX, extent.MaxY, extent.MinX, extent.MaxY); // top
    addEdge(extent.MinX, extent.MaxY, extent.MinX, extent.MinY); // left

    std::unique_ptr<OGRCoordinateTransformation, decltype(&OCTDestroyCoordinateTransformation)> transform(
        OGRCreateCoordinateTransformation(&srcSrs, &wgs84),
        OCTDestroyCoordinateTransformation
    );

    if (!transform) {
        debugInfo += "OGRCreateCoordinateTransformation failed; ";
        return false;
    }

    for (size_t i = 0; i < points.size(); ++i) {
        double x = points[i].x;
        double y = points[i].y;
        if (!transform->Transform(1, &x, &y)) {
            debugInfo += "OGR transform failed at point " + std::to_string(i) + "; ";
            return false;
        }
        points[i].x = x;
        points[i].y = y;
    }

    auto minMaxX = std::minmax_element(points.begin(), points.end(),
        [](const SamplePoint& a, const SamplePoint& b) { return a.x < b.x; });
    auto minMaxY = std::minmax_element(points.begin(), points.end(),
        [](const SamplePoint& a, const SamplePoint& b) { return a.y < b.y; });
    minX = minMaxX.first->x;
    maxX = minMaxX.second->x;
    minY = minMaxY.first->y;
    maxY = minMaxY.second->y;

    debugInfo += "OGR reprojection successful; ";
    return true;
}

// ----------------- main API -----------------
std::string Native::getVectorInfo(
    const std::vector<uint8_t>& inputData,
    const std::string& inputFormat,
    const std::string& sourceCrs
) {
    GDALAllRegister();
    resetLastError();

    // Set PROJ data path for WebAssembly/Emscripten environment
    // Try common paths where cpp.js might mount the PROJ data
    const char* projPaths[] = {
        "/proj",
        "/usr/share/proj",
        "/data/proj",
        "/opt/proj/share/proj",
        nullptr
    };

    for (const char** path = projPaths; *path != nullptr; ++path) {
        VSIStatBufL statBuf;
        if (VSIStatL(*path, &statBuf) == 0) {
            CPLSetConfigOption("PROJ_LIB", *path);
            break;
        }
    }

    // Enable debug output
    CPLSetConfigOption("CPL_DEBUG", "ON");

    CPLPushErrorHandler(ErrHandler);

    std::string result = "{}";
    VSILFILE* fpIn = nullptr;

    try {
        // Materialize input in /vsimem
        std::string inputPath;
        const std::string inFmt = toLower(inputFormat);

        if (inFmt == "shapefile") {
            const std::string zipPath = "/vsimem/preview_input.zip";
            fpIn = VSIFileFromMemBuffer(zipPath.c_str(),
                                        const_cast<GByte*>(inputData.data()),
                                        static_cast<vsi_l_offset>(inputData.size()),
                                        FALSE);
            if (!fpIn) throw std::runtime_error("Failed to create input ZIP file");
            VSIFCloseL(fpIn); fpIn = nullptr;

            const std::string zipVsi = "/vsizip/" + zipPath;
            inputPath = pickShpInsideZip(zipVsi);
            if (inputPath.empty()) throw std::runtime_error("No .shp found in input ZIP");
        } else {
            std::string inputExt = getExtensionFromFormat(inFmt);
            if (inputExt == ".zip") inputExt = ".dat";
            inputPath = "/vsimem/preview_input" + inputExt;
            fpIn = VSIFileFromMemBuffer(inputPath.c_str(),
                                        const_cast<GByte*>(inputData.data()),
                                        static_cast<vsi_l_offset>(inputData.size()),
                                        FALSE);
            if (!fpIn) throw std::runtime_error("Failed to create input virtual file");
            VSIFCloseL(fpIn); fpIn = nullptr;
        }

        // Open dataset
        GDALDataset* poDS = (GDALDataset*)GDALOpenEx(
            inputPath.c_str(), GDAL_OF_VECTOR | GDAL_OF_READONLY, nullptr, nullptr, nullptr
        );
        if (!poDS) throw std::runtime_error("Failed to open input dataset");

        // Extract metadata using native GDAL API
        std::string json = "{";

        // Layer count
        int layerCount = poDS->GetLayerCount();
        json += "\"layers\":" + std::to_string(layerCount) + ",";

        // Feature count from first layer
        GIntBig featureCount = 0;
        std::string geometryType = "Unknown";
        std::string crs = "Unknown";
        std::string properties = "[]";

        if (layerCount > 0) {
            OGRLayer* poLayer = poDS->GetLayer(0);
            if (poLayer) {
                // Feature count
                featureCount = poLayer->GetFeatureCount();
                json += "\"featureCount\":" + std::to_string(featureCount) + ",";

                // Geometry type from layer definition
                OGRwkbGeometryType geomType = poLayer->GetGeomType();
                geometryType = OGRGeometryTypeToName(geomType);
                json += "\"geometryType\":\"" + escapeJsonString(geometryType) + "\",";

                // CRS/SRS - use user-provided sourceCrs if available, otherwise detect
                OGRSpatialReference* srs = poLayer->GetSpatialRef();
                std::unique_ptr<OGRSpatialReference> userSrs;

                std::string debugInfo = "";

                // Debug: Check PROJ_LIB setting
                const char* projLib = CPLGetConfigOption("PROJ_LIB", nullptr);
                if (projLib) {
                    debugInfo += "PROJ_LIB=" + std::string(projLib) + "; ";
                } else {
                    debugInfo += "PROJ_LIB not set; ";
                }

                // If user provided a source CRS, use it for reprojection
                if (!sourceCrs.empty()) {
                    debugInfo += "User provided sourceCrs: " + sourceCrs + "; ";
                    userSrs = std::make_unique<OGRSpatialReference>();

                    OGRErr err = OGRERR_FAILURE;

                    // Try to parse EPSG code and use importFromEPSG
                    if (sourceCrs.find("EPSG:") == 0 || sourceCrs.find("epsg:") == 0) {
                        try {
                            int epsgCode = std::stoi(sourceCrs.substr(5));
                            debugInfo += "Trying importFromEPSG(" + std::to_string(epsgCode) + "); ";
                            err = userSrs->importFromEPSG(epsgCode);
                            if (err != OGRERR_NONE) {
                                debugInfo += "importFromEPSG failed (error " + std::to_string(err) + "); ";
                            }
                        } catch (...) {
                            debugInfo += "Failed to parse EPSG code; ";
                        }
                    }

                    // If importFromEPSG failed or wasn't tried, try SetFromUserInput
                    if (err != OGRERR_NONE) {
                        debugInfo += "Trying SetFromUserInput; ";
                        err = userSrs->SetFromUserInput(sourceCrs.c_str());
                        if (err != OGRERR_NONE) {
                            debugInfo += "SetFromUserInput failed (error " + std::to_string(err) + "); ";
                        }
                    }

                    if (err == OGRERR_NONE) {
                        userSrs->SetAxisMappingStrategy(OAMS_TRADITIONAL_GIS_ORDER);
                        srs = userSrs.get();
                        crs = sourceCrs; // Display what user selected
                        debugInfo += "Successfully set user CRS; ";
                    } else {
                        debugInfo += "GDAL CRS methods failed, but will try PROJ for transform; ";
                        // Don't reset - we'll still use sourceCrs for PROJ transformation
                        // even though GDAL couldn't create an OGRSpatialReference from it
                        crs = sourceCrs; // Display what user selected
                        userSrs.reset();
                    }
                } else {
                    debugInfo += "No sourceCrs provided; ";
                }

                // If no user CRS was provided at all, use layer's CRS
                if (sourceCrs.empty() && srs) {
                    const char* authName = srs->GetAuthorityName(nullptr);
                    const char* authCode = srs->GetAuthorityCode(nullptr);
                    if (authName && authCode) {
                        crs = std::string(authName) + ":" + std::string(authCode);
                        debugInfo += "Using layer CRS: " + crs + "; ";
                    } else {
                        char* wkt = nullptr;
                        srs->exportToWkt(&wkt);
                        if (wkt) {
                            crs = std::string(wkt).substr(0, 50); // Truncate for brevity
                            debugInfo += "Using layer CRS from WKT; ";
                            CPLFree(wkt);
                        }
                    }
                }
                json += "\"crs\":\"" + escapeJsonString(crs) + "\",";
                json += "\"debugCrs\":\"" + escapeJsonString(debugInfo) + "\",";

                // Bounding box (extent)
                OGREnvelope extent;
                if (poLayer->GetExtent(&extent, TRUE) == OGRERR_NONE) {
                    // Store original bbox for debugging
                    json += "\"bboxOriginal\":[";
                    json += std::to_string(extent.MinX) + ",";
                    json += std::to_string(extent.MinY) + ",";
                    json += std::to_string(extent.MaxX) + ",";
                    json += std::to_string(extent.MaxY);
                    json += "],";

                    double bboxMinX = extent.MinX;
                    double bboxMinY = extent.MinY;
                    double bboxMaxX = extent.MaxX;
                    double bboxMaxY = extent.MaxY;

                    // Determine which CRS to use for transformation
                    // Prefer user-provided sourceCrs, otherwise use layer's CRS
                    std::string transformSourceCrs = sourceCrs.empty() ? crs : sourceCrs;

                    std::string transformDebug = "";
                    const bool bboxReprojected = transformExtentToWgs84(
                        extent,
                        transformSourceCrs,
                        bboxMinX,
                        bboxMinY,
                        bboxMaxX,
                        bboxMaxY,
                        transformDebug
                    );

                    if (bboxReprojected) {
                        json += "\"bboxReprojected\":true,";
                    } else {
                        json += "\"bboxReprojected\":false,";
                    }

                    json += "\"debugTransform\":\"" + escapeJsonString(transformDebug) + "\",";

                    json += "\"bbox\":[";
                    json += std::to_string(bboxMinX) + ",";
                    json += std::to_string(bboxMinY) + ",";
                    json += std::to_string(bboxMaxX) + ",";
                    json += std::to_string(bboxMaxY);
                    json += "],";
                }

                // Properties from first feature
                poLayer->ResetReading();
                OGRFeature* poFeature = poLayer->GetNextFeature();
                if (poFeature) {
                    properties = "[";
                    OGRFeatureDefn* poFDefn = poLayer->GetLayerDefn();
                    int fieldCount = poFDefn->GetFieldCount();

                    for (int i = 0; i < fieldCount; i++) {
                        OGRFieldDefn* poFieldDefn = poFDefn->GetFieldDefn(i);
                        std::string fieldName = poFieldDefn->GetNameRef();
                        OGRFieldType fieldType = poFieldDefn->GetType();

                        // Get field value
                        std::string fieldValue = "null";
                        std::string fieldTypeName = "String";

                        if (!poFeature->IsFieldNull(i) && poFeature->IsFieldSet(i)) {
                            switch (fieldType) {
                                case OFTInteger:
                                    fieldValue = std::to_string(poFeature->GetFieldAsInteger(i));
                                    fieldTypeName = "Integer";
                                    break;
                                case OFTInteger64:
                                    fieldValue = std::to_string(poFeature->GetFieldAsInteger64(i));
                                    fieldTypeName = "Integer";
                                    break;
                                case OFTReal:
                                    fieldValue = std::to_string(poFeature->GetFieldAsDouble(i));
                                    fieldTypeName = "Float";
                                    break;
                                case OFTString:
                                    fieldValue = "\"" + std::string(poFeature->GetFieldAsString(i)) + "\"";
                                    fieldTypeName = "String";
                                    break;
                                case OFTDate:
                                case OFTDateTime:
                                    fieldValue = "\"" + std::string(poFeature->GetFieldAsString(i)) + "\"";
                                    fieldTypeName = "Date";
                                    break;
                                default:
                                    fieldValue = "\"" + std::string(poFeature->GetFieldAsString(i)) + "\"";
                                    fieldTypeName = "String";
                                    break;
                            }
                        }

                        if (i > 0) properties += ",";
                        properties += "{";
                        properties += "\"name\":\"" + fieldName + "\",";
                        properties += "\"value\":" + fieldValue + ",";
                        properties += "\"type\":\"" + fieldTypeName + "\"";
                        properties += "}";
                    }
                    properties += "]";

                    OGRFeature::DestroyFeature(poFeature);
                }
            }
        }

        json += "\"properties\":" + properties;
        json += "}";

        result = json;

        // Cleanup
        GDALClose(poDS);
        if (inFmt == "shapefile") {
            VSIUnlink("/vsimem/preview_input.zip");
        } else {
            VSIUnlink(inputPath.c_str());
        }

    } catch (const std::exception& ex) {
        ensureLastErrorMessage();
        if (g_lastError.empty() && ex.what()) {
            g_lastError = ex.what();
        }
        result = "{\"error\":\"" + std::string(ex.what()) + "\"}";
    }

    CPLPopErrorHandler();
    return result;
}

std::vector<uint8_t> Native::convertVector(
    const std::vector<uint8_t>& inputData,
    const std::string& inputFormat,
    const std::string& outputFormat,
    const std::string& sourceCrs,
    const std::string& targetCrs,
    const std::string& layerName,
    const std::string& geometryTypeFilter,
    bool skipFailures,
    bool makeValid,
    bool keepZ,
    const std::string& whereClause,
    const std::string& selectFields,
    double simplifyTolerance,
    bool explodeCollections,
    bool preserveFid,
    int geojsonPrecision,
    const std::string& csvGeometryMode
) {
    GDALAllRegister();
    std::vector<uint8_t> result;

    resetLastError();
    CPLPushErrorHandler(ErrHandler);

    // ---- 1) Materialize input in /vsimem and open
    std::string inputPath;
    VSILFILE* fpIn = nullptr;
    std::string driver;

    try {
        const std::string inFmt = toLower(inputFormat);
        if (inFmt == "shapefile") {
            const std::string zipPath = "/vsimem/input.zip";
            fpIn = VSIFileFromMemBuffer(zipPath.c_str(),
                                        const_cast<GByte*>(inputData.data()),
                                        static_cast<vsi_l_offset>(inputData.size()),
                                        FALSE);
            if (!fpIn) throw std::runtime_error("Failed to create input ZIP file");
            VSIFCloseL(fpIn); fpIn = nullptr;

            const std::string zipVsi = "/vsizip/" + zipPath; // note: /vsizip//vsimem/input.zip also works
            inputPath = pickShpInsideZip(zipVsi);
            if (inputPath.empty()) throw std::runtime_error("No .shp found in input ZIP");
        } else {
            std::string inputExt = getExtensionFromFormat(inFmt);
            if (inputExt == ".zip") inputExt = ".dat"; // non-shp should not be zip here
            inputPath = "/vsimem/input" + inputExt;
            fpIn = VSIFileFromMemBuffer(inputPath.c_str(),
                                        const_cast<GByte*>(inputData.data()),
                                        static_cast<vsi_l_offset>(inputData.size()),
                                        FALSE);
            if (!fpIn) throw std::runtime_error("Failed to create input virtual file");
            VSIFCloseL(fpIn); fpIn = nullptr;
        }

        GDALDataset* poSrcDS = (GDALDataset*)GDALOpenEx(
            inputPath.c_str(), GDAL_OF_VECTOR | GDAL_OF_READONLY, nullptr, nullptr, nullptr
        );
        if (!poSrcDS) throw std::runtime_error("Failed to open input dataset");

        // ---- 2) Decide driver and output path
        driver = getDriverNameFromFormat(outputFormat);
        const std::string outExt = getExtensionFromFormat(outputFormat);

        // Special case SHP: write to individual directory, then collect all files
        if (driver == "ESRI Shapefile") {
            const std::string baseDir = "/vsimem/shp_output";

            const int nL = poSrcDS->GetLayerCount();
            for (int i = 0; i < nL; i++) {
                OGRLayer* L = poSrcDS->GetLayer(i);
                if (!L) continue;
                const std::string srcLayerName = L->GetName();

                // We split into up to 4 shapefiles per layer, only if counts > 0
                struct Part { const char* where; const char* suffix; bool promoteToMulti; };
                const Part parts[] = {
                    { WHERE_POINT,      "_point",      false },
                    { WHERE_MULTIPOINT, "_multipoint", false },
                    { WHERE_LINES,      "_lines",      true  },
                    { WHERE_POLYS,      "_polygons",   true  }
                };

                for (const auto& p : parts) {
                    GIntBig cnt = countGeomWhere(poSrcDS, srcLayerName, p.where);
                    if (cnt <= 0) continue;

                    const std::string baseName =
                        (layerName.empty() ? srcLayerName : layerName) + std::string(p.suffix);
                    const std::string outPath = baseDir + "/" + baseName + ".shp";

                    std::vector<std::string> args = {
                        "-f", "ESRI Shapefile",
                        "-where", p.where,
                        "-nln", baseName,
                        "-dim", keepZ ? "XYZ" : "XY"
                    };

                    // Explode collections
                    if (explodeCollections) {
                        args.push_back("-explodecollections");
                    }

                    if (p.promoteToMulti) {
                        args.insert(args.end(), {"-nlt", "PROMOTE_TO_MULTI"});
                    }

                    // Global options
                    if (skipFailures) args.push_back("-skipfailures");
                    if (makeValid) args.push_back("-makevalid");
                    if (preserveFid) args.push_back("-preserve_fid");
                    if (simplifyTolerance > 0) {
                        args.insert(args.end(), {"-simplify", std::to_string(simplifyTolerance)});
                    }

                    pushDriverLCO(args, driver, geojsonPrecision, csvGeometryMode);
                    pushCrsArgs(args, poSrcDS, sourceCrs, targetCrs);

                    GDALDataset* dst = runVectorTranslate(poSrcDS, outPath, args);
                    if (!dst) {
                        continue;
                    }
                    GDALClose(dst);
                }
            }

            // Now collect all files from the directory and create a proper ZIP
            // Using GDAL's /vsizip/ in write mode
            char** fileList = VSIReadDir(baseDir.c_str());
            if (!fileList) {
                throw std::runtime_error("No shapefile components created");
            }

            // Create a proper ZIP by copying files into it
            const std::string zipPath = "/vsimem/output.zip";
            for (int i = 0; fileList[i] != nullptr; i++) {
                std::string fileName = fileList[i];
                if (fileName == "." || fileName == "..") continue;

                std::string srcPath = baseDir + "/" + fileName;
                std::string dstPath = "/vsizip/" + zipPath + "/" + fileName;

                // Read source file
                vsi_l_offset nBytes = 0;
                GByte* fileData = VSIGetMemFileBuffer(srcPath.c_str(), &nBytes, FALSE);
                if (fileData && nBytes > 0) {
                    // Write to ZIP
                    VSILFILE* fpOut = VSIFOpenL(dstPath.c_str(), "wb");
                    if (fpOut) {
                        VSIFWriteL(fileData, 1, nBytes, fpOut);
                        VSIFCloseL(fpOut);
                    }
                }
                VSIUnlink(srcPath.c_str());
            }
            CSLDestroy(fileList);
            VSIRmdirRecursive(baseDir.c_str());

            // collect the resulting ZIP bytes
            vsi_l_offset zipLen = 0;
            GByte* zipBuf = VSIGetMemFileBuffer(zipPath.c_str(), &zipLen, FALSE);
            if (zipBuf && zipLen > 0) {
                result.assign(zipBuf, zipBuf + zipLen);
            } else {
                throw std::runtime_error("Failed to create shapefile ZIP");
            }
            VSIUnlink(zipPath.c_str());
        }
        else {
            // Non-SHP: single output file in /vsimem
            const std::string outPath = "/vsimem/output" + outExt;

            std::vector<std::string> args = {
                "-f", driver,
                "-dim", keepZ ? "XYZ" : "XY"
            };

            // Explode collections
            if (explodeCollections) {
                args.push_back("-explodecollections");
            }

            // Global options
            if (skipFailures) args.push_back("-skipfailures");
            if (makeValid) args.push_back("-makevalid");
            if (preserveFid) args.push_back("-preserve_fid");

            // Simplify geometry
            if (simplifyTolerance > 0) {
                args.insert(args.end(), {"-simplify", std::to_string(simplifyTolerance)});
            }

            // optional per-format LCOs
            pushDriverLCO(args, driver, geojsonPrecision, csvGeometryMode);
            // CRS behavior
            pushCrsArgs(args, poSrcDS, sourceCrs, targetCrs);

            // Optional layer rename (mostly relevant for single-layer formats)
            if (!layerName.empty()) {
                args.insert(args.end(), {"-nln", layerName});
            }

            // Optional geometry filter (single family)
            const std::string where = whereFromFilter(geometryTypeFilter);
            if (!where.empty()) {
                args.insert(args.end(), {"-where", where});
            }

            // User-provided WHERE clause (more flexible than geometry filter)
            if (!whereClause.empty()) {
                args.insert(args.end(), {"-where", whereClause});
            }

            // Field selection
            if (!selectFields.empty()) {
                args.insert(args.end(), {"-select", selectFields});
            }

            GDALDataset* dst = runVectorTranslate(poSrcDS, outPath, args);
            if (!dst) {
                GDALClose(poSrcDS);
                throw std::runtime_error("Vector translate failed");
            }
            GDALClose(dst);

            // read output file
            vsi_l_offset n = 0;
            GByte* buf = VSIGetMemFileBuffer(outPath.c_str(), &n, FALSE);
            if (!buf || n == 0) {
                GDALClose(poSrcDS);
                VSIUnlink(outPath.c_str());
                throw std::runtime_error("Failed to read output data");
            }
            result.assign(buf, buf + n);
            VSIUnlink(outPath.c_str());
        }

        GDALClose(poSrcDS);

        // cleanup input
        if (toLower(inputFormat) == "shapefile") {
            VSIUnlink("/vsimem/input.zip");
        } else {
            VSIUnlink(inputPath.c_str());
        }

        if (result.empty()) {
            ensureLastErrorMessage();
            if (g_lastError.empty()) {
                g_lastError = "GDAL returned an empty dataset";
            }
            if (!sourceCrs.empty() || !targetCrs.empty()) {
                g_lastError += " (source CRS: " + (sourceCrs.empty() ? std::string("auto") : sourceCrs)
                             + ", target CRS: " + (targetCrs.empty() ? std::string("auto") : targetCrs) + ")";
            }
            if (!driver.empty()) {
                g_lastError += " driver=" + driver;
            }
        }

    } catch (const std::exception& ex) {
        // For now, keep contract: empty vector indicates failure.
        ensureLastErrorMessage();
        if (g_lastError.empty() && ex.what()) {
            g_lastError = ex.what();
        }
        result.clear();
    }

    CPLPopErrorHandler();

    if (result.empty()) {
        ensureLastErrorMessage();
        if (g_lastError.empty()) {
            g_lastError = "No output produced by GDAL";
        }
    }

    return result;
}

std::string Native::getLastError() {
    return g_lastError;
}
