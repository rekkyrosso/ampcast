const fsp = require('fs').promises;
const {resolve} = require('path');
const express = require('express');
const Router = express.Router;

const host = 'localhost';
const port = 8000;
const app = express();
const webServer = Router();
const wwwDir = resolve(__dirname, './www');
const devDir = resolve(__dirname, './www-dev');
const webIndex = resolve(wwwDir, './index.html');

webServer.get('/', (_, res) => res.sendFile(webIndex));

webServer.use('/auth', express.static(resolve(wwwDir, './auth')));
webServer.use('/lib', express.static(resolve(wwwDir, './lib')));

webServer.get('/bundle.css', async (_, res) => {
    const path = await getLatest('bundle.css');
    res.sendFile(path);
});

webServer.get('/bundle.js', async (_, res) => {
    const path = await getLatest('bundle.js');
    res.sendFile(path);
});

app.use('/', webServer);
app.get('*', (_, res) => res.redirect('/'));

app.listen(port, host, () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Server started at: ${timestamp}`);
});

async function getLatest(fileName) {
    const useDev = await isDev();
    const dir = useDev ? devDir : wwwDir;
    return resolve(dir, `./${fileName}`);
}

async function isDev() {
    const devCss = resolve(devDir, 'bundle.css');
    const prodCss = resolve(wwwDir, 'bundle.css');
    const devJs = resolve(devDir, 'bundle.js');
    const prodJs = resolve(wwwDir, 'bundle.js');
    const [devCssTimestamp, prodCssTimestamp, devJsTimestamp, prodJsTimestamp] = await Promise.all([
        getModifiedTime(devCss),
        getModifiedTime(prodCss),
        getModifiedTime(devJs),
        getModifiedTime(prodJs),
    ]);
    const sorted = [devCssTimestamp, prodCssTimestamp, devJsTimestamp, prodJsTimestamp]
        .sort()
        .reverse();
    return sorted[0] === devCssTimestamp || sorted[0] === devJsTimestamp;
}

async function getModifiedTime(fileName) {
    try {
        const stat = await fsp.stat(fileName);
        return stat.mtimeMs;
    } catch (err) {
        return 0;
    }
}
