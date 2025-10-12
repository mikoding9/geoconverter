import Matrix from '@cpp.js/sample-lib-prebuilt-matrix/cppjs.config.js';
import gdal from '@cpp.js/package-gdal/cppjs.config.js';

export default {
    general: {
        name: 'cppjs-sample-web-react-vite',
    },
    dependencies: [
        Matrix,
        gdal,
    ],
    paths: {
        config: import.meta.url,
    },
};
