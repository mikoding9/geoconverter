#include "native.h"
#include <gdal.h>
#include <gdal_priv.h>
#include <ogr_api.h>
#include <ogrsf_frmts.h>
#include <cpl_vsi.h>
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
    if (format == "kml") return "KML";
    if (format == "gpx") return "GPX";
    if (format == "gml") return "GML";
    if (format == "csv") return "CSV";
    return "GeoJSON"; // default
}

std::string getExtensionFromFormat(const std::string& format) {
    if (format == "geojson") return ".geojson";
    if (format == "shapefile") return ".shp";
    if (format == "kml") return ".kml";
    if (format == "gpx") return ".gpx";
    if (format == "gml") return ".gml";
    if (format == "csv") return ".csv";
    return ".geojson"; // default
}

std::vector<uint8_t> Native::convertVector(
    const std::vector<uint8_t>& inputData,
    const std::string& inputFormat,
    const std::string& outputFormat
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

        // Use CreateCopy for conversion
        GDALDataset* poDstDS = poDriver->CreateCopy(
            outputPath.c_str(),
            poSrcDS,
            FALSE,
            nullptr,
            nullptr,
            nullptr
        );

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

        // Read output data from virtual file system
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

        // Clean up virtual files
        if (inputFormat == "shapefile") {
            VSIUnlink("/vsimem/input.zip");
        } else {
            VSIUnlink(inputPath.c_str());
        }
        VSIUnlink(outputPath.c_str());

    } catch (const std::exception& e) {
        // Return empty vector on error
        result.clear();
    }

    return result;
}
