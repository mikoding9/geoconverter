#include "native.h"
#include <gdal.h>
#include <gdal_priv.h>
#include <ogr_api.h>
#include <ogrsf_frmts.h>
#include <ogr_spatialref.h>
#include <cpl_vsi.h>
#include <cpl_string.h>
#include <gdalwarper.h>
#include <sstream>

std::string Native::getGdalInfo() {
    GDALAllRegister();

    std::string info = "GDAL Version: ";
    info += GDALVersionInfo("VERSION_NUM");
    info += " (";
    info += GDALVersionInfo("RELEASE_NAME");
    info += ")";

    return info;
}

std::string getDriverNameFromFormat(const std::string& format) {
    if (format == "geojson") return "GeoJSON";
    if (format == "shapefile") return "ESRI Shapefile";
    if (format == "geopackage") return "GPKG";
    if (format == "kml") return "KML";
    if (format == "gpx") return "GPX";
    if (format == "gml") return "GML";
    return "GeoJSON"; // default
}

std::string getExtensionFromFormat(const std::string& format) {
    if (format == "geojson") return ".geojson";
    if (format == "shapefile") return ".shp";
    if (format == "geopackage") return ".gpkg";
    if (format == "kml") return ".kml";
    if (format == "gpx") return ".gpx";
    if (format == "gml") return ".gml";
    return ".geojson"; // default
}

std::vector<uint8_t> Native::convertVector(
    const std::vector<uint8_t>& inputData,
    const std::string& inputFormat,
    const std::string& outputFormat,
    const std::string& sourceCrs,
    const std::string& targetCrs,
    const std::string& layerName,
    const std::string& geometryTypeFilter
) {
    GDALAllRegister();

    std::vector<uint8_t> result;

    try {
        // Create input virtual file
        std::string inputExt = getExtensionFromFormat(inputFormat);
        std::string inputPath;

        // For shapefiles, we expect ZIP format
        if (inputFormat == "shapefile") {
            // Write ZIP file to virtual file system
            std::string zipPath = "/vsimem/input.zip";
            VSILFILE* fpZip = VSIFileFromMemBuffer(
                zipPath.c_str(),
                const_cast<GByte*>(inputData.data()),
                inputData.size(),
                FALSE
            );
            if (!fpZip) {
                throw std::runtime_error("Failed to create input ZIP file");
            }
            VSIFCloseL(fpZip);

            // Use /vsizip/ to access the shapefile inside
            inputPath = "/vsizip/" + zipPath;
        } else {
            inputPath = "/vsimem/input" + inputExt;
            VSILFILE* fpIn = VSIFileFromMemBuffer(
                inputPath.c_str(),
                const_cast<GByte*>(inputData.data()),
                inputData.size(),
                FALSE
            );
            if (!fpIn) {
                throw std::runtime_error("Failed to create input virtual file");
            }
            VSIFCloseL(fpIn);
        }

        // Open input dataset
        GDALDataset* poSrcDS = (GDALDataset*)GDALOpenEx(
            inputPath.c_str(),
            GDAL_OF_VECTOR | GDAL_OF_READONLY,
            nullptr,
            nullptr,
            nullptr
        );

        if (poSrcDS == nullptr) {
            if (inputFormat == "shapefile") {
                VSIUnlink("/vsimem/input.zip");
            } else {
                VSIUnlink(inputPath.c_str());
            }
            throw std::runtime_error("Failed to open input dataset");
        }

        // Get output driver
        std::string outputDriverName = getDriverNameFromFormat(outputFormat);
        GDALDriver* poDriver = GetGDALDriverManager()->GetDriverByName(outputDriverName.c_str());

        if (poDriver == nullptr) {
            GDALClose(poSrcDS);
            if (inputFormat == "shapefile") {
                VSIUnlink("/vsimem/input.zip");
            } else {
                VSIUnlink(inputPath.c_str());
            }
            throw std::runtime_error("Output driver not available: " + outputDriverName);
        }

        // Create output virtual file
        std::string outputExt = getExtensionFromFormat(outputFormat);
        std::string outputPath = "/vsimem/output" + outputExt;

        // Handle CRS reprojection for vector data
        GDALDataset* poDstDS = nullptr;

        // Check if we need to perform CRS transformation
        bool needsTransformation = !sourceCrs.empty() && !targetCrs.empty() && sourceCrs != targetCrs;

        if (needsTransformation) {
            // Create coordinate transformation
            OGRSpatialReference oSourceSRS, oTargetSRS;
            OGRErr errSource = oSourceSRS.SetFromUserInput(sourceCrs.c_str());
            OGRErr errTarget = oTargetSRS.SetFromUserInput(targetCrs.c_str());

            if (errSource != OGRERR_NONE || errTarget != OGRERR_NONE) {
                GDALClose(poSrcDS);
                if (inputFormat == "shapefile") {
                    VSIUnlink("/vsimem/input.zip");
                } else {
                    VSIUnlink(inputPath.c_str());
                }
                throw std::runtime_error("Failed to parse CRS definitions");
            }

            OGRCoordinateTransformation* poCT = OGRCreateCoordinateTransformation(&oSourceSRS, &oTargetSRS);
            if (poCT == nullptr) {
                GDALClose(poSrcDS);
                if (inputFormat == "shapefile") {
                    VSIUnlink("/vsimem/input.zip");
                } else {
                    VSIUnlink(inputPath.c_str());
                }
                throw std::runtime_error("Failed to create coordinate transformation");
            }

            // Create output dataset
            poDstDS = poDriver->Create(
                outputPath.c_str(),
                0, 0, 0,
                GDT_Unknown,
                nullptr
            );

            if (poDstDS == nullptr) {
                OGRCoordinateTransformation::DestroyCT(poCT);
                GDALClose(poSrcDS);
                if (inputFormat == "shapefile") {
                    VSIUnlink("/vsimem/input.zip");
                } else {
                    VSIUnlink(inputPath.c_str());
                }
                throw std::runtime_error("Failed to create output dataset");
            }

            // Process each layer
            int layerCount = poSrcDS->GetLayerCount();
            for (int i = 0; i < layerCount; i++) {
                OGRLayer* poSrcLayer = poSrcDS->GetLayer(i);
                if (poSrcLayer == nullptr) continue;

                // Determine output layer name
                std::string outputLayerName = layerName.empty() ? poSrcLayer->GetName() : layerName;

                // Create output layer with target CRS
                OGRLayer* poDstLayer = poDstDS->CreateLayer(
                    outputLayerName.c_str(),
                    &oTargetSRS,
                    poSrcLayer->GetGeomType(),
                    nullptr
                );

                if (poDstLayer == nullptr) continue;

                // Copy layer definition (fields)
                OGRFeatureDefn* poSrcFDefn = poSrcLayer->GetLayerDefn();
                for (int iField = 0; iField < poSrcFDefn->GetFieldCount(); iField++) {
                    OGRFieldDefn* poFieldDefn = poSrcFDefn->GetFieldDefn(iField);
                    poDstLayer->CreateField(poFieldDefn);
                }

                // Copy and transform features
                poSrcLayer->ResetReading();
                OGRFeature* poFeature;
                while ((poFeature = poSrcLayer->GetNextFeature()) != nullptr) {
                    OGRGeometry* poGeometry = poFeature->GetGeometryRef();

                    // Apply geometry type filter if specified
                    if (!geometryTypeFilter.empty() && poGeometry != nullptr) {
                        std::string geomTypeName = OGRGeometryTypeToName(poGeometry->getGeometryType());
                        if (geomTypeName.find(geometryTypeFilter) == std::string::npos) {
                            OGRFeature::DestroyFeature(poFeature);
                            continue; // Skip features that don't match the geometry type filter
                        }
                    }

                    if (poGeometry != nullptr) {
                        OGRErr err = poGeometry->transform(poCT);
                        if (err != OGRERR_NONE) {
                            OGRFeature::DestroyFeature(poFeature);
                            continue; // Skip features that fail to transform
                        }
                    }

                    // Create new feature in output layer
                    OGRFeature* poDstFeature = OGRFeature::CreateFeature(poDstLayer->GetLayerDefn());
                    poDstFeature->SetFrom(poFeature);

                    if (poDstLayer->CreateFeature(poDstFeature) != OGRERR_NONE) {
                        OGRFeature::DestroyFeature(poDstFeature);
                        OGRFeature::DestroyFeature(poFeature);
                        continue;
                    }

                    OGRFeature::DestroyFeature(poDstFeature);
                    OGRFeature::DestroyFeature(poFeature);
                }
            }

            OGRCoordinateTransformation::DestroyCT(poCT);

        } else {
            // No transformation needed, but check if we need filtering or layer name changes
            bool needsCustomProcessing = !layerName.empty() || !geometryTypeFilter.empty();

            if (needsCustomProcessing) {
                // Need to process layer by layer for filtering or renaming
                poDstDS = poDriver->Create(
                    outputPath.c_str(),
                    0, 0, 0,
                    GDT_Unknown,
                    nullptr
                );

                if (poDstDS == nullptr) {
                    GDALClose(poSrcDS);
                    if (inputFormat == "shapefile") {
                        VSIUnlink("/vsimem/input.zip");
                    } else {
                        VSIUnlink(inputPath.c_str());
                    }
                    throw std::runtime_error("Failed to create output dataset");
                }

                // Process each layer
                int layerCount = poSrcDS->GetLayerCount();
                for (int i = 0; i < layerCount; i++) {
                    OGRLayer* poSrcLayer = poSrcDS->GetLayer(i);
                    if (poSrcLayer == nullptr) continue;

                    // Determine output layer name
                    std::string outputLayerName = layerName.empty() ? poSrcLayer->GetName() : layerName;

                    // Get source spatial reference
                    OGRSpatialReference* poSrcSRS = poSrcLayer->GetSpatialRef();

                    // Create output layer
                    OGRLayer* poDstLayer = poDstDS->CreateLayer(
                        outputLayerName.c_str(),
                        poSrcSRS,
                        poSrcLayer->GetGeomType(),
                        nullptr
                    );

                    if (poDstLayer == nullptr) continue;

                    // Copy layer definition (fields)
                    OGRFeatureDefn* poSrcFDefn = poSrcLayer->GetLayerDefn();
                    for (int iField = 0; iField < poSrcFDefn->GetFieldCount(); iField++) {
                        OGRFieldDefn* poFieldDefn = poSrcFDefn->GetFieldDefn(iField);
                        poDstLayer->CreateField(poFieldDefn);
                    }

                    // Copy features with optional filtering
                    poSrcLayer->ResetReading();
                    OGRFeature* poFeature;
                    while ((poFeature = poSrcLayer->GetNextFeature()) != nullptr) {
                        OGRGeometry* poGeometry = poFeature->GetGeometryRef();

                        // Apply geometry type filter if specified
                        if (!geometryTypeFilter.empty() && poGeometry != nullptr) {
                            std::string geomTypeName = OGRGeometryTypeToName(poGeometry->getGeometryType());
                            if (geomTypeName.find(geometryTypeFilter) == std::string::npos) {
                                OGRFeature::DestroyFeature(poFeature);
                                continue;
                            }
                        }

                        // Create new feature in output layer
                        OGRFeature* poDstFeature = OGRFeature::CreateFeature(poDstLayer->GetLayerDefn());
                        poDstFeature->SetFrom(poFeature);

                        if (poDstLayer->CreateFeature(poDstFeature) != OGRERR_NONE) {
                            OGRFeature::DestroyFeature(poDstFeature);
                            OGRFeature::DestroyFeature(poFeature);
                            continue;
                        }

                        OGRFeature::DestroyFeature(poDstFeature);
                        OGRFeature::DestroyFeature(poFeature);
                    }
                }
            } else {
                // Simple copy, no filtering or custom processing needed
                char** papszOptions = nullptr;

                // If target CRS is specified but no transformation needed, set it on output
                if (!targetCrs.empty()) {
                    papszOptions = CSLSetNameValue(papszOptions, "TARGET_SRS", targetCrs.c_str());
                }

                poDstDS = poDriver->CreateCopy(
                    outputPath.c_str(),
                    poSrcDS,
                    FALSE,
                    papszOptions,
                    nullptr,
                    nullptr
                );

                CSLDestroy(papszOptions);
            }
        }

        if (poDstDS == nullptr) {
            GDALClose(poSrcDS);
            if (inputFormat == "shapefile") {
                VSIUnlink("/vsimem/input.zip");
            } else {
                VSIUnlink(inputPath.c_str());
            }
            throw std::runtime_error("Conversion failed - could not create output");
        }

        // Close datasets to flush
        GDALClose(poDstDS);
        GDALClose(poSrcDS);

        // For shapefile output, we need to ZIP all the related files
        if (outputFormat == "shapefile") {
            // Create a ZIP file in memory containing all shapefile components
            std::string zipPath = "/vsimem/output.zip";
            std::string zipVsiPath = "/vsizip/" + zipPath;

            // Common shapefile extensions
            const char* extensions[] = {".shp", ".shx", ".dbf", ".prj", ".cpg"};
            std::string baseName = "/vsimem/output";

            // Copy each shapefile component into the ZIP
            for (const char* ext : extensions) {
                std::string srcFile = baseName + ext;
                vsi_l_offset fileLength = 0;
                GByte* fileData = VSIGetMemFileBuffer(srcFile.c_str(), &fileLength, FALSE);

                if (fileData != nullptr && fileLength > 0) {
                    // Write to ZIP
                    std::string zipEntryPath = zipVsiPath + "/output" + ext;
                    VSILFILE* fpZipEntry = VSIFOpenL(zipEntryPath.c_str(), "wb");
                    if (fpZipEntry) {
                        VSIFWriteL(fileData, 1, fileLength, fpZipEntry);
                        VSIFCloseL(fpZipEntry);
                    }
                }

                // Clean up individual file
                VSIUnlink(srcFile.c_str());
            }

            // Read the ZIP file
            vsi_l_offset zipLength = 0;
            GByte* zipData = VSIGetMemFileBuffer(zipPath.c_str(), &zipLength, FALSE);

            if (zipData != nullptr && zipLength > 0) {
                result.assign(zipData, zipData + zipLength);
            } else {
                throw std::runtime_error("Failed to create shapefile ZIP");
            }

            VSIUnlink(zipPath.c_str());

        } else {
            // For other formats, read single file
            vsi_l_offset nLength = 0;
            GByte* pabyData = VSIGetMemFileBuffer(outputPath.c_str(), &nLength, FALSE);

            if (pabyData != nullptr && nLength > 0) {
                result.assign(pabyData, pabyData + nLength);
            } else {
                if (inputFormat == "shapefile") {
                    VSIUnlink("/vsimem/input.zip");
                } else {
                    VSIUnlink(inputPath.c_str());
                }
                VSIUnlink(outputPath.c_str());
                throw std::runtime_error("Failed to read output data");
            }

            VSIUnlink(outputPath.c_str());
        }

        // Clean up input files
        if (inputFormat == "shapefile") {
            VSIUnlink("/vsimem/input.zip");
        } else {
            VSIUnlink(inputPath.c_str());
        }

    } catch (const std::exception& e) {
        // Return empty vector on error
        result.clear();
    }

    return result;
}
