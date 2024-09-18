const path = require('path');
const fs = require('fs');
const http = require('http');
const argv = require('minimist')(process.argv.slice(2));
const {host = 'localhost', port = 8000} = argv;
const wwwDir = path.resolve(__dirname, './app/www');
const devDir = path.resolve(__dirname, './www-dev');
const runtimeDir = argv.dev ? devDir : wwwDir;

const mimeTypes = {
    js: 'application/javascript',
    json: 'application/json',
    ico: 'image/vnd.microsoft.icon',
    png: 'image/png',
    svg: 'image/svg+xml',
    css: 'text/css',
    html: 'text/html',
    text: 'text/plain',
};

const server = http.createServer(async (req, res) => {
    try {
        let pathname = req.url.replace(/[?#].*$/, '');
        const staticDir = pathname === '/' || /\.(css|js)$/.test(pathname) ? runtimeDir : wwwDir;
        if (pathname.endsWith('/')) {
            pathname += 'index.html';
        }
        const filePath = path.join(staticDir, pathname);
        const pathTraversal = !filePath.startsWith(staticDir);
        const exists =
            !pathTraversal &&
            (await fs.promises.stat(filePath).then(
                (stat) => stat.isFile(),
                () => false
            ));
        if (exists) {
            const ext = path.extname(pathname).substring(1).toLowerCase();
            const mimeType = mimeTypes[ext] || mimeTypes.text;
            const stream = fs.createReadStream(filePath);
            res.writeHead(200, {'Content-Type': mimeType});
            stream.pipe(res);
            // console.info(`${req.method} ${req.url} OK`);
        } else {
            console.warn(`${req.method} ${req.url} NOT FOUND`);
            res.writeHead(404, {'Content-Type': mimeTypes.text});
            res.end('Not found');
        }
    } catch (err) {
        console.error(`${req.method} ${req.url} ERROR`);
        console.error(err);
        res.writeHead(500, {'Content-Type': mimeTypes.text});
        res.end('Internal server error');
    }
});

server.listen(port, host, () => {
    const timestamp = new Date().toLocaleString();
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Using files from: ${runtimeDir}`);
    console.info(`Server started at: ${timestamp}`);
});
