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

webServer.get('/bundle.css', async (_, res) => res.sendFile(resolve(devDir, `./bundle.css`)));
webServer.get('/bundle.js', async (_, res) => res.sendFile(resolve(devDir, `./bundle.js`)));

app.use('/', webServer);
app.get('*', (_, res) => res.redirect('/'));

app.listen(port, host, () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Server started at: ${timestamp}`);
});
