const {resolve} = require('path');
const express = require('express');
const argv = require('minimist')(process.argv.slice(2));
const {host = 'localhost', port = 8000} = argv;
const app = express();
const wwwDir = resolve(__dirname, './app/www');
const devDir = resolve(__dirname, './www-dev');
const runtimeDir = argv.dev ? devDir : wwwDir;
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

app.get('/', (_, res) => res.sendFile(webIndex));
app.get('/privacy-policy.html', (_, res) => res.sendFile(resolve(wwwDir, './privacy-policy.html')));
app.use('/apple-touch-icon.png', express.static(resolve(wwwDir, './apple-touch-icon.png')));
app.use('/favicon.ico', express.static(resolve(wwwDir, './favicon.ico')));
app.use('/favicon.svg', express.static(resolve(wwwDir, './favicon.svg')));
app.use('/icon-192.png', express.static(resolve(wwwDir, './icon-192.png')));
app.use('/icon-512.png', express.static(resolve(wwwDir, './icon-512.png')));
app.use('/manifest.json', express.static(resolve(wwwDir, './manifest.json')));
app.use('/auth', express.static(resolve(wwwDir, './auth')));
app.get('/:version/:id.css', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.version}/${req.params.id}.css`))
);
app.get('/:version/:id.js', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.version}/${req.params.id}.js`))
);
app.get('/:version/lib/:id.js', async (req, res) =>
    res.sendFile(resolve(runtimeDir, `./${req.params.version}/lib/${req.params.id}.js`))
);
app.get('*', (_, res) => res.redirect('/'));

app.listen(port, host, () => {
    const timestamp = new Date().toLocaleString();
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Using files from: ${runtimeDir}`);
    console.info(`Server started at: ${timestamp}`);
});
