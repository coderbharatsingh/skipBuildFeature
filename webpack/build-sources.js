module.exports = {
    'packt-plus': {
        scss: {
            'resources/sass/app.scss': 'public/css',
            'resources/sass/bootstrap.scss': 'public/css',
            'resources/sass/public/reader.scss': 'public/css',
        },
        vue: {
            'resources/js/laravel_vue.js': 'public/js',
        },
        react: {
            'resources/src/index.tsx': 'public/js/react.js',
        },
    },
    laravel: {
        scss: {
            'resources/sass/laravel/common/common.scss': 'public/css/laravel',
        },
        js: {
            'resources/js/laravel/common/common.js': 'public/js/laravel',
        },
    },
    admin: {
        scss: {
            'resources/sass/admin/app.scss': 'public/css/admin',
        },
        vue: {
            'resources/js/admin.js': 'public/js',
        },
    },
};
