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
        const std::string& outputFormat
    );
};

#endif
