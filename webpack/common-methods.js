const fs = require('fs');
const path = require('path');

const getBuildPaths = (buildPaths) => {
    const currentPath = path.resolve(__dirname, '../');
    Object.keys(buildPaths).map((key) => {
        Object.keys(buildPaths[key]).map((index) => {
            Object.keys(buildPaths[key][index]).map((pathIndex) => {
                let publicPath = buildPaths[key][index][pathIndex];
                const realCurrentPath = path.resolve(currentPath, publicPath);
                const fileName = path.extname(realCurrentPath).length > 0 ? path.parse(realCurrentPath).base : false;
                const dirPath = fileName
                    ? realCurrentPath.replace(new RegExp(`/${fileName}$`, 'i'), '')
                    : realCurrentPath;
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                if (fs.existsSync(realCurrentPath) && fs.lstatSync(realCurrentPath).isDirectory()) {
                    publicPath = path.join(
                        publicPath,
                        path
                            .basename(pathIndex)
                            .replace(new RegExp(/.scss$/, 'i'), '.css')
                            .replace(new RegExp(/.tsx|.ts$/, 'i'), '.js')
                    );

                    buildPaths[key][index][pathIndex] = publicPath;
                }

                if (fs.existsSync(path.join(currentPath, publicPath)) && process.env.APP_ENV_NAME !== 'local') {
                    delete buildPaths[key][index][pathIndex];
                }
            });
        });
    });

    return buildPaths;
};

module.exports = { getBuildPaths };
