#include "native.h"
#include <gdal.h>
#include <gdal_priv.h>
#include <ogr_api.h>
#include <ogrsf_frmts.h>
#include <ogr_spatialref.h>
#include <cpl_vsi.h>
#include <cpl_string.h>
#include <gdalwarper.h>
#include <gdal_utils.h>
#include <algorithm>

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

static std::string getDriverNameFromFormat(const std::string& format) {
    auto f = toLower(format);
    if (f == "geojson")     return "GeoJSON";
    if (f == "shapefile")   return "ESRI Shapefile";
    if (f == "geopackage")  return "GPKG";
    if (f == "kml")         return "KML";
    if (f == "gpx")         return "GPX";
    if (f == "gml")         return "GML";
    if (f == "flatgeobuf")  return "FlatGeobuf";
    if (f == "csv")         return "CSV";
    if (f == "pmtiles")     return "PMTiles";
    if (f == "mbtiles")     return "MBTiles";
    return "GeoJSON";
}

static std::string getExtensionFromFormat(const std::string& format) {
    auto f = toLower(format);
    if (f == "geojson")     return ".geojson";
    if (f == "shapefile")   return ".zip";      // we will return a ZIP containing the SHP set
    if (f == "geopackage")  return ".gpkg";
    if (f == "kml")         return ".kml";
    if (f == "gpx")         return ".gpx";
    if (f == "gml")         return ".gml";
    if (f == "flatgeobuf")  return ".fgb";
    if (f == "csv")         return ".csv";
    if (f == "pmtiles")     return ".pmtiles";
    if (f == "mbtiles")     return ".mbtiles";
    return ".geojson";
}

// Simple error handler without user data (compatible with older GDAL)
static void ErrHandler(CPLErr, int, const char*) {
    // Errors are collected by GDAL's default mechanism
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
static void pushCrsArgs(std::vector<std::string>& args,
                        GDALDataset* src,
                        const std::string& sourceCrs,
                        const std::string& targetCrs)
{
    const bool haveSrc = !sourceCrs.empty();
    const bool haveDst = !targetCrs.empty();
    if (haveSrc && haveDst && sourceCrs != targetCrs) {
        args.insert(args.end(), {"-s_srs", sourceCrs, "-t_srs", targetCrs});
        return;
    }
    if (haveDst && !haveSrc) {
        // Only assign if layers have no SRS — heuristic: check first layer
        OGRLayer* L0 = src->GetLayerCount() > 0 ? src->GetLayer(0) : nullptr;
        OGRSpatialReference* srs = L0 ? L0->GetSpatialRef() : nullptr;
        if (srs == nullptr) {
            args.insert(args.end(), {"-a_srs", targetCrs});
        }
    }
}

static void pushDriverLCO(std::vector<std::string>& args, const std::string& driver, int geojsonPrecision, const std::string& csvGeometryMode) {
    if (driver == "ESRI Shapefile") {
        args.insert(args.end(), {"-lco", "ENCODING=UTF-8"});
    } else if (driver == "GeoJSON") {
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

// ----------------- main API -----------------
std::string Native::getVectorInfo(
    const std::vector<uint8_t>& inputData,
    const std::string& inputFormat
) {
    GDALAllRegister();

    CPLPushErrorHandler(ErrHandler);
    CPLErrorReset();

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
                json += "\"geometryType\":\"" + geometryType + "\",";

                // CRS/SRS
                OGRSpatialReference* srs = poLayer->GetSpatialRef();
                if (srs) {
                    const char* authName = srs->GetAuthorityName(nullptr);
                    const char* authCode = srs->GetAuthorityCode(nullptr);
                    if (authName && authCode) {
                        crs = std::string(authName) + ":" + std::string(authCode);
                    } else {
                        char* wkt = nullptr;
                        srs->exportToWkt(&wkt);
                        if (wkt) {
                            crs = std::string(wkt).substr(0, 50); // Truncate for brevity
                            CPLFree(wkt);
                        }
                    }
                }
                json += "\"crs\":\"" + crs + "\",";

                // Bounding box (extent)
                OGREnvelope extent;
                if (poLayer->GetExtent(&extent, TRUE) == OGRERR_NONE) {
                    json += "\"bbox\":[";
                    json += std::to_string(extent.MinX) + ",";
                    json += std::to_string(extent.MinY) + ",";
                    json += std::to_string(extent.MaxX) + ",";
                    json += std::to_string(extent.MaxY);
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

    CPLPushErrorHandler(ErrHandler);
    CPLErrorReset();

    // ---- 1) Materialize input in /vsimem and open
    std::string inputPath;
    VSILFILE* fpIn = nullptr;

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
        const std::string driver = getDriverNameFromFormat(outputFormat);
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

    } catch (const std::exception& ex) {
        // For now, keep contract: empty vector indicates failure.
        (void)ex;
        result.clear();
    }

    CPLPopErrorHandler();
    return result;
}
