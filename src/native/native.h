#ifndef _NATIVE_H
#define _NATIVE_H

#include <string>
#include <memory>
#include <vector>

class Native {
public:
    static std::string getGdalInfo();
    static std::vector<uint8_t> convertVector(
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
    );
};

#endif
