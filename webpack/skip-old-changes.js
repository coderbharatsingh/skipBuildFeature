const fs = require('fs');
const fse = require('fs-extra');
const precinct = require('precinct');
const { buildPaths } = require('./mix');
const filecompare = require('file-sync-cmp');
const path = require('path');

function getTarLinkOfSymLink(path) {
    try {
        return fs.readlinkSync(path);
    } catch (err) {
        return false;
    }
}

const currentDefaultPath = '../../../current';
let currentPath = path.resolve(__dirname, process.argv[2] || currentDefaultPath);
const symlink = getTarLinkOfSymLink(currentPath);
currentPath = symlink ? symlink : currentPath;
const releasePath = path.resolve(__dirname, '../');
if (!fs.existsSync(currentPath) || !fs.lstatSync(currentPath).isDirectory()) {
    throw new Error('Invalid Path');
}

const getDiff = () => {
    const releaseEnv = require('dotenv').config({ path: path.resolve(releasePath, '.env') }).parsed;
    const envFile = fs.existsSync(path.resolve(currentPath, '.env.backup')) ? '.env.backup' : '.env';
    const currentEnv = require('dotenv').config({ path: path.resolve(currentPath, envFile) }).parsed;
    let changes = [];
    Object.keys({ ...releaseEnv, ...currentEnv }).map((index) => {
        if (currentEnv?.[index] !== releaseEnv?.[index] && index.match(/^MIX_/)) {
            changes.push(index);
        }
    });
    return changes;
};

const newEnvVal = getDiff();
const equalFiles = [],
    unEqualFiles = [];

const convertToJson = (data) => {
    try {
        data = data.replace(/\/\/.*?\n/g, '').trim();
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const copyFile = (filePath) => {
    const realCurrentPath = path.resolve(currentPath, filePath);
    if (fs.existsSync(realCurrentPath) && fs.lstatSync(realCurrentPath).isFile()) {
        fs.writeFileSync(path.resolve(releasePath, filePath), fs.readFileSync(realCurrentPath));
    }
};

const getPaths = (filePath, v3TsFile = false) => {
    const links = [];
    const readFilesLinks = [];
    const basePath = v3TsFile ? path.resolve(releasePath, 'resources/src/sites') : releasePath;
    const tsConfigContent = fs.readFileSync(`${basePath}/tsconfig.json`, { encoding: 'utf8' });
    const tsConfig = convertToJson(tsConfigContent);
    const tsConfigPaths = tsConfig?.['compilerOptions']?.['paths'] || {};
    const tsPaths = {};
    Object.keys(tsConfigPaths).map((tsPath) => {
        tsPaths[tsPath.replace('*', '')] = path.resolve(basePath, tsConfigPaths?.[tsPath]?.[0] || '').replace('*', '');
    });

    const filterPaths = (paths, ext) => {
        const links = [];
        paths.map((path) => {
            const tsKeys = Object.keys(tsPaths);
            for (let i = 0; i < tsKeys.length; i++) {
                path = path.replace(new RegExp(`^${tsKeys[i]}`, 'i'), tsPaths[tsKeys[i]]);
            }

            if (!path.match(new RegExp(`(^|/)(node_modules/|~)`, 'i'))) {
                if (ext === 'scss' && !path.match(new RegExp('^[.]{1,2}/', 'i'))) {
                    path = `./${path}`;
                }

                if (path.match(new RegExp('^[.]{1,2}/', 'i')) || path.match(new RegExp(`^${basePath}/`, 'i'))) {
                    links.push(path);
                }
            }
        });
        return links;
    };

    const addLink = (link) => {
        if (Array.isArray(link)) {
            for (let i = 0; i < link.length; i++) {
                if (!addLink(link[i])) {
                    return false;
                }
            }
        } else {
            link = link.replace(new RegExp(`^${releasePath}/`, 'i'), '');
            const sourcePath = path.resolve(releasePath, link);
            const destinationPath = path.resolve(currentPath, link);
            if (links.indexOf(link) > -1) {
                return true;
            } else {
                links.push(link);
            }

            if (!fs.existsSync(sourcePath) || !fs.existsSync(destinationPath)) {
                return false;
            }

            if (equalFiles.indexOf(link) > -1 && unEqualFiles.indexOf(link) > -1) {
                return equalFiles.indexOf(link) > -1;
            }

            const isEqual = filecompare.equalFiles(sourcePath, destinationPath);
            if (isEqual) {
                equalFiles.push(link);
            } else {
                unEqualFiles.push(link);
            }
            return isEqual;
        }

        return true;
    };

    const readFile = (filePath) => {
        filePath = filePath.replace(new RegExp(`^${releasePath}/`, 'i'), '');
        if (readFilesLinks.indexOf(filePath) > -1) {
            return true;
        } else {
            readFilesLinks.push(filePath);
        }

        const ext = path.extname(filePath).replace('.', '');
        const src = fs.readFileSync(filePath, 'utf-8');
        for (let i = 0; i < newEnvVal.length; i++) {
            if (src.match(newEnvVal[i])) {
                return false;
            }
        }

        let type = {};
        let imports = src.match(/import.*?['"]([^'"]+)['"](;|\n)/gi) || [];
        const exports = src.match(/export.*?['"]([^'"]+)['"](;|\n)/gi) || [];
        const requires = src.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/gi) || [];

        if (ext === 'scss') {
            type = { type: 'scss' };
            imports = src.match(/@import\s+(?:['"])(.+?)(?:['"])\s*;/gi) || [];
        }

        const content = `
            ${imports.join('\n')};
            ${exports.join('\n')}
            ${requires.join('\n')}
        `;
        const filePaths = precinct(content, { ...type, includeCore: false, es6: { mixedImports: true } });
        const paths = filterPaths(filePaths, ext);
        const newPaths = [filePath];

        for (let i = 0; i < paths.length; i++) {
            const pathLink = path.resolve(filePath, '../', paths[i]);
            let newLink = pathLink;
            if (fs.existsSync(pathLink + '.js')) {
                newLink = pathLink + '.js';
            } else if (fs.existsSync(pathLink + '.scss')) {
                newLink = pathLink + '.scss';
            } else if (fs.existsSync(pathLink + '.tsx')) {
                newLink = pathLink + '.tsx';
            } else if (fs.existsSync(pathLink + '.ts')) {
                newLink = pathLink + '.ts';
            } else if (fs.existsSync(pathLink + '.vue')) {
                newLink = pathLink + '.vue';
            } else if (fs.existsSync(pathLink) && fs.lstatSync(pathLink).isDirectory()) {
                if (fs.existsSync(pathLink + '/index.js')) {
                    newLink = pathLink + '/index.js';
                } else if (fs.existsSync(pathLink + '/index.vue')) {
                    newLink = pathLink + '/index.vue';
                } else if (fs.existsSync(pathLink + '/index.tsx')) {
                    newLink = pathLink + '/index.tsx';
                } else if (fs.existsSync(pathLink + '/index.ts')) {
                    newLink = pathLink + '/index.ts';
                }
            } else if (!fs.existsSync(newLink)) {
                if (ext === 'scss') {
                    const baseName = path.basename(newLink);
                    newLink = newLink.replace(new RegExp(`/${baseName}$`, 'i'), `/_${baseName}.scss`);
                }
            }

            if (fs.existsSync(newLink) && fs.lstatSync(newLink).isFile()) {
                newPaths.push(newLink);
            } else {
                console.error(paths[i], 'Path not exist');
            }
        }

        if (!addLink(newPaths)) {
            return false;
        }

        for (let i = 0; i < newPaths.length; i++) {
            if (!readFile(newPaths[i])) {
                return false;
            }
        }

        return true;
    };

    return readFile(filePath);
};

const copyOldFileChanges = async () => {
    const mixFilePath = 'public/mix-manifest.json';
    const manifestFile = path.resolve(currentPath, mixFilePath);
    const mixContent = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, { encoding: 'utf8' }) : {};
    const mixLinks = convertToJson(mixContent);
    const mixFileLinks = {};
    const allBuildPaths = { ...buildPaths };

    for (let i = 0; i < Object.keys(allBuildPaths).length; i++) {
        const key = Object.keys(allBuildPaths)[i];

        for (let j = 0; j < Object.keys(allBuildPaths[key]).length; j++) {
            const index = Object.keys(allBuildPaths[key])[j];

            for (let k = 0; k < Object.keys(allBuildPaths[key][index]).length; k++) {
                const pathIndex = Object.keys(allBuildPaths[key][index])[k];
                let publicPath = allBuildPaths[key][index][pathIndex];
                const noUpdate = getPaths(
                    path.resolve(releasePath, pathIndex),
                    false
                );
                if (noUpdate) {
                    const filePath = publicPath.replace(new RegExp('^public', 'i'), '');
                    if (mixLinks?.[filePath]) {
                        mixFileLinks[filePath] = mixLinks[filePath];
                    }
                    const licensePath = publicPath + '.LICENSE.txt';
                    copyFile(publicPath + '.gz');
                    copyFile(publicPath + '.br');
                    copyFile(publicPath);
                    copyFile(licensePath);
                } else {
                    console.log('Changes detects for -- ', publicPath);
                }
            }
        }
    }

    fs.writeFileSync(path.resolve(releasePath, mixFilePath), JSON.stringify(mixFileLinks));

    // copy fonts directory
    const mixFontsDir = 'public/fonts';
    fse.copySync(path.resolve(releasePath, mixFontsDir), path.resolve(currentPath, mixFontsDir));
};

copyOldFileChanges();
