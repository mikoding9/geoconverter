#include "native.h"
#include <gdal.h>
#include <gdal_priv.h>

std::string Native::getGdalInfo() {
    GDALAllRegister();

    std::string info = "GDAL Version: ";
    info += GDALVersionInfo("VERSION_NUM");
    info += " (";
    info += GDALVersionInfo("RELEASE_NAME");
    info += ")";

    return info;
}
