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

const runtimeDir = process.argv[2] === '--prod' ? wwwDir : devDir;

express.static.mime.define({
    'application/json': ['json'],
    'image/vnd.microsoft.icon': ['ico'],
    'image/png': ['png'],
    'image/svg+xml': ['svg'],
});

webServer.get('/', (_, res) => res.sendFile(webIndex));

webServer.use('/apple-touch-icon.png', express.static(resolve(wwwDir, './apple-touch-icon.png')));
webServer.use('/favicon.ico', express.static(resolve(wwwDir, './favicon.ico')));
webServer.use('/favicon.svg', express.static(resolve(wwwDir, './favicon.svg')));
webServer.use('/icon-192.png', express.static(resolve(wwwDir, './icon-192.png')));
webServer.use('/icon-512.png', express.static(resolve(wwwDir, './icon-512.png')));
webServer.use('/manifest.json', express.static(resolve(wwwDir, './manifest.json')));

webServer.use('/auth', express.static(resolve(wwwDir, './auth')));

webServer.get('/bundle.css', async (_, res) => res.sendFile(resolve(runtimeDir, `./bundle.css`)));
webServer.get('/:id.js', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.id}.js`))
);
webServer.get('/lib/:id.js', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./lib/${req.params.id}.js`))
);

app.use('/', webServer);
app.get('*', (_, res) => res.redirect('/'));

app.listen(port, host, () => {
    const timestamp = new Date().toLocaleString();
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Using files from: ${runtimeDir}`);
    console.info(`Server started at: ${timestamp}`);
});
