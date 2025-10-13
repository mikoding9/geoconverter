import gdal from '@cpp.js/package-gdal/cppjs.config.js';

export default {
    general: {
        name: 'cppjs-sample-web-react-vite',
    },
    dependencies: [
        gdal,
    ],
    paths: {
        config: import.meta.url,
    },
};
