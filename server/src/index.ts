import {statSync, createReadStream} from 'fs';
import express from 'express';
import {webDir, webIndex, webPort} from './config';
import mediaLibrary from './mediaLibrary';

const app = express();

// www root folder
app.use(express.static(webDir));

app.post('/commands/media/clear', (_, res) => {
    console.log('/commands/media/clear');
    mediaLibrary.clear();
    res.send('');
});

app.post('/commands/media/scan', (_, res) => {
    console.log('/commands/media/scan');
    mediaLibrary.scan('F:/downloaded');
    res.send('');
});

// https://github.com/daspinola/video-stream-sample
app.get('/media/:id', (req, res) => {
    const id = req.params.id;
    const path = 'F:/music/Recent/Dua Lipa - Be the One.mp3';
    const fileSize = statSync(path).size;
    const range = req.headers.range;

    console.log(`/media/${id}, range=${range}`);

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize - 1;

        if (start >= fileSize) {
            res.status(416).send(`Requested range not satisfiable.`);
            return;
        }
        
        const chunkSize = (end - start) + 1;
        const file = createReadStream(path, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'audo/mp3',
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'audo/mp3',
        }
        res.writeHead(200, head);
        createReadStream(path).pipe(res);
    }
});

// Send all other requests to the app. // -@DRE
app.get('*', (_, res) => {
    res.sendFile(webIndex);
});

// Create an HTTP server.
app.listen(webPort, () => {
    console.info(`The server is running on http://localhost:${webPort}`);
});
