import gdal from "@cpp.js/package-gdal/cppjs.config.js";

export default {
  general: {
    name: "cpp",
  },
  dependencies: [gdal],
  paths: {
    config: import.meta.url,
  },
};
