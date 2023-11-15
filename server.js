const {resolve} = require('path');
const express = require('express');
const Router = express.Router;

const host = 'localhost';
const port = 8000;
const app = express();
const webServer = Router();
const wwwDir = resolve(__dirname, './www');
const devDir = resolve(__dirname, './www-dev');
const runtimeDir = process.argv[2] === '--prod' ? wwwDir : devDir;
const webIndex = resolve(runtimeDir, './index.html');

express.static.mime.define({
    'application/javascript': ['js'],
    'application/json': ['json'],
    'image/vnd.microsoft.icon': ['ico'],
    'image/png': ['png'],
    'image/svg+xml': ['svg'],
    'text/css': ['css'],
    'text/html': ['html'],
});

webServer.get('/', (_, res) => res.sendFile(webIndex));
webServer.get('/privacy-policy.html', (_, res) =>
    res.sendFile(resolve(wwwDir, './privacy-policy.html'))
);

webServer.use('/apple-touch-icon.png', express.static(resolve(wwwDir, './apple-touch-icon.png')));
webServer.use('/favicon.ico', express.static(resolve(wwwDir, './favicon.ico')));
webServer.use('/favicon.svg', express.static(resolve(wwwDir, './favicon.svg')));
webServer.use('/icon-192.png', express.static(resolve(wwwDir, './icon-192.png')));
webServer.use('/icon-512.png', express.static(resolve(wwwDir, './icon-512.png')));
webServer.use('/manifest.json', express.static(resolve(wwwDir, './manifest.json')));

webServer.use('/auth', express.static(resolve(wwwDir, './auth')));

webServer.get('/:version/bundle.css', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.version}/bundle.css`))
);
webServer.get('/:version/:id.js', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.version}/${req.params.id}.js`))
);
webServer.get('/:version/lib/:id.js', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.version}/lib/${req.params.id}.js`))
);

app.use('/', webServer);
app.get('*', (_, res) => res.redirect('/'));

app.listen(port, host, () => {
    const timestamp = new Date().toLocaleString();
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Using files from: ${runtimeDir}`);
    console.info(`Server started at: ${timestamp}`);
});
