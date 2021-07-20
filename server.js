const fsp = require('fs').promises;
const {resolve} = require('path');
const express = require('express');
const Router = express.Router;

const host = 'localhost';
const port = 8000;
const app = express();
const webServer = Router();
const webDir = resolve(__dirname, './www');
const devDir = resolve(__dirname, './www-dev');
const webIndex = resolve(webDir, './index.html');

webServer.get('/', (_, res) => res.sendFile(webIndex));

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
    const devFile = resolve(devDir, `./${fileName}`);
    const prodFile = resolve(webDir, `./${fileName}`);
    const devTimestamp = (await fsp.stat(devFile)).mtimeMs;
    const prodTimestamp = (await fsp.stat(prodFile)).mtimeMs;
    return devTimestamp > prodTimestamp ? devFile : prodFile;
}
