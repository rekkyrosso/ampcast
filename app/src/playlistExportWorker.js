import {parentPort, workerData} from 'node:worker_threads';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import NodeID3 from 'node-id3';

const {request, destination} = workerData;
const tracks = Array.isArray(request?.tracks) ? request.tracks : [];
const abortController = new AbortController();
let lastProgressAt = 0;

parentPort.on('message', (message) => {
    if (message?.type === 'cancel') abortController.abort();
});

run().then(
    (result) => {
        parentPort.postMessage({type: 'result', result});
        parentPort.close();
    },
    (err) => {
        parentPort.postMessage({type: 'error', error: err?.message || String(err)});
        parentPort.close();
    }
);

async function run() {
    const playlistName = sanitizeFileName(request?.name || 'Ampcast playlist');
    const exportDirectory = path.join(destination, playlistName);
    await fsPromises.mkdir(exportDirectory, {recursive: true});
    const playlistPath = path.join(exportDirectory, `${playlistName}.m3u8`);
    const oldPlaylist = await readManagedPlaylist(playlistPath);
    const canReuseFiles =
        oldPlaylist.bitRate === Number(request.bitRate) && oldPlaylist.tagVersion === 1;
    const artworkCache = new Map();
    if (canReuseFiles) {
        await reconcileExportedTrackNames(oldPlaylist, tracks, exportDirectory);
    }

    const errors = [];
    const playlistEntries = new Array(tracks.length);
    let exported = 0;
    let reservedBytes = 0;
    let nextTrackIndex = 0;
    const {bavail, bsize} = await fsPromises.statfs(exportDirectory);
    const availableBytes = Number(bavail) * Number(bsize);

    const exportTrack = async (index) => {
        const track = tracks[index];
        if (abortController.signal.aborted) return;
        try {
            const fileName = getExportFileName(track, index, tracks.length);
            const finalPath = path.join(exportDirectory, fileName);
            if (canReuseFiles && (await isNonEmptyFile(finalPath))) {
                exported++;
                playlistEntries[index] = createM3uEntry(track, fileName);
                sendProgress({
                    completed: exported,
                    total: tracks.length,
                    title: track.title || fileName,
                    bytesWritten: 0,
                }, exported === tracks.length);
                return;
            }

            const response = await fetch(track.url, {
                redirect: 'follow',
                signal: abortController.signal,
            });
            if (!response.ok || !response.body) throw Error(`HTTP ${response.status}`);
            const contentLength = Number(response.headers.get('content-length')) || 0;
            reservedBytes += contentLength;
            if (contentLength && reservedBytes > availableBytes) {
                throw Error('Not enough free space on the destination drive');
            }

            const partialPath = `${finalPath}.part`;
            await fsPromises.rm(partialPath, {force: true});
            let bytesWritten = 0;
            const progressStream = new Transform({
                transform(chunk, _, callback) {
                    bytesWritten += chunk.length;
                    sendProgress({
                        completed: exported,
                        total: tracks.length,
                        bytesWritten,
                        totalBytes: contentLength || undefined,
                    });
                    callback(null, chunk);
                },
            });
            try {
                await pipeline(
                    Readable.fromWeb(response.body),
                    progressStream,
                    fs.createWriteStream(partialPath, {flags: 'wx'}),
                    {signal: abortController.signal}
                );
                await writeCarCompatibleTags(
                    track,
                    partialPath,
                    artworkCache,
                    abortController.signal
                );
                await fsPromises.rm(finalPath, {force: true});
                await fsPromises.rename(partialPath, finalPath);
            } catch (err) {
                await fsPromises.rm(partialPath, {force: true});
                throw err;
            }

            exported++;
            playlistEntries[index] = createM3uEntry(track, fileName);
            sendProgress({
                completed: exported,
                total: tracks.length,
                title: track.title || fileName,
                bytesWritten,
                totalBytes: contentLength || undefined,
            }, exported === tracks.length);
        } catch (err) {
            if (!abortController.signal.aborted) {
                errors.push(`${track.title || `Track ${index + 1}`}: ${err.message || err}`);
            }
        }
    };

    const exportWorker = async () => {
        while (!abortController.signal.aborted) {
            const index = nextTrackIndex++;
            if (index >= tracks.length) return;
            await exportTrack(index);
        }
    };
    const requestedConcurrency = Math.trunc(Number(request.concurrency)) || 3;
    const concurrency = Math.min(Math.max(requestedConcurrency, 1), 8, tracks.length);
    await Promise.all(Array.from({length: concurrency}, () => exportWorker()));

    const m3uEntries = playlistEntries.filter(Boolean).flat();
    if (!abortController.signal.aborted && errors.length === 0) {
        const currentFiles = new Set(playlistEntries.filter(Boolean).map((entry) => entry.at(-1)));
        await replaceTextFile(playlistPath, createM3uFile(request.bitRate, m3uEntries));
        await Promise.all(
            [...oldPlaylist.files]
                .filter((fileName) => !currentFiles.has(fileName))
                .map((fileName) => fsPromises.rm(path.join(exportDirectory, fileName), {force: true}))
        );
    } else if (oldPlaylist.files.size === 0) {
        await replaceTextFile(playlistPath, createM3uFile(request.bitRate, m3uEntries));
    }
    return {
        canceled: abortController.signal.aborted,
        exported,
        skipped: Number(request?.skipped) || 0,
        errors,
        destination: exportDirectory,
    };
}

function sendProgress(progress, force = false) {
    const now = Date.now();
    if (force || now - lastProgressAt >= 100) {
        lastProgressAt = now;
        parentPort.postMessage({type: 'progress', progress});
    }
}

function sanitizeFileName(value) {
    const sanitized = String(value)
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/[. ]+$/g, '')
        .trim();
    return sanitized.slice(0, 180) || 'Untitled';
}

function createM3uEntry(track, fileName) {
    const displayName = `${track.artist ? `${track.artist} - ` : ''}${track.title || fileName}`;
    return [
        `#AMPCAST-ID:${encodeURIComponent(track.id || '')}`,
        `#EXTINF:${Math.round(track.duration || -1)},${displayName.replace(/[\r\n]/g, ' ')}`,
        fileName,
    ];
}

function getExportFileName(track, index, total) {
    const prefix = String(index + 1).padStart(String(total).length, '0');
    const baseName = sanitizeFileName(
        track.fileName || `${track.title || `Track ${index + 1}`}.mp3`
    );
    return `${prefix} - ${baseName}`;
}

async function isNonEmptyFile(filePath) {
    try {
        const stats = await fsPromises.stat(filePath);
        return stats.isFile() && stats.size > 0;
    } catch {
        return false;
    }
}

function createM3uFile(bitRate, entries) {
    return `${[
        '#EXTM3U',
        `#AMPCAST:BITRATE=${Number(bitRate)}`,
        '#AMPCAST:TAGS=1',
        ...entries,
    ].join('\r\n')}\r\n`;
}

async function readManagedPlaylist(playlistPath) {
    try {
        const contents = await fsPromises.readFile(playlistPath, 'utf8');
        const bitRate = Number(contents.match(/^#AMPCAST:BITRATE=(\d+)\r?$/m)?.[1]) || 0;
        const tagVersion = Number(contents.match(/^#AMPCAST:TAGS=(\d+)\r?$/m)?.[1]) || 0;
        const entries = [];
        let id;
        for (const rawLine of contents.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (line.startsWith('#AMPCAST-ID:')) {
                try {
                    id = decodeURIComponent(line.slice('#AMPCAST-ID:'.length));
                } catch {
                    id = undefined;
                }
            } else if (line && !line.startsWith('#') && path.basename(line) === line) {
                entries.push({id, fileName: line});
                id = undefined;
            }
        }
        return {bitRate, tagVersion, entries, files: new Set(entries.map(({fileName}) => fileName))};
    } catch {
        return {bitRate: 0, tagVersion: 0, files: new Set(), entries: []};
    }
}

async function reconcileExportedTrackNames(oldPlaylist, currentTracks, exportDirectory) {
    const unused = new Set(oldPlaylist.entries);
    const assignments = [];
    for (let index = 0; index < currentTracks.length; index++) {
        const track = currentTracks[index];
        const desiredName = getExportFileName(track, index, currentTracks.length);
        const desiredBase = stripTrackPosition(desiredName);
        let entry = [...unused].find(({id}) => id && id === track.id);
        entry ||= [...unused].find(
            ({fileName}) => stripTrackPosition(fileName).toLowerCase() === desiredBase.toLowerCase()
        );
        if (!entry) continue;
        const sourcePath = path.join(exportDirectory, entry.fileName);
        if (!(await isNonEmptyFile(sourcePath))) continue;
        unused.delete(entry);
        if (entry.fileName !== desiredName) {
            assignments.push({sourcePath, destinationPath: path.join(exportDirectory, desiredName)});
        }
    }
    const staged = [];
    for (const assignment of assignments) {
        const temporaryPath = `${assignment.sourcePath}.reorder-${crypto.randomUUID()}`;
        await fsPromises.rename(assignment.sourcePath, temporaryPath);
        staged.push({...assignment, temporaryPath});
    }
    for (const {temporaryPath, destinationPath} of staged) {
        await fsPromises.rm(destinationPath, {force: true});
        await fsPromises.rename(temporaryPath, destinationPath);
    }
}

function stripTrackPosition(fileName) {
    return fileName.replace(/^\d+ - /, '');
}

async function writeCarCompatibleTags(track, filePath, artworkCache, signal) {
    const tags = {
        title: String(track.title || ''),
        artist: String(track.artist || track.albumArtist || ''),
        performerInfo: String(track.albumArtist || track.artist || ''),
        album: String(track.album || ''),
        trackNumber: track.track ? String(track.track) : undefined,
        partOfSet: track.disc ? String(track.disc) : undefined,
        year: track.year ? String(track.year) : undefined,
    };
    if (track.artworkUrl) {
        try {
            const imageBuffer = await getArtwork(track.artworkUrl, artworkCache, signal);
            if (imageBuffer) {
                tags.image = {
                    mime: 'image/jpeg',
                    type: {id: 3, name: 'front cover'},
                    description: 'Cover',
                    imageBuffer,
                };
            }
        } catch (err) {
            if (signal.aborted) throw err;
        }
    }
    const result = NodeID3.update(tags, filePath);
    if (result instanceof Error) throw result;
}

async function getArtwork(url, cache, signal) {
    if (!cache.has(url)) {
        cache.set(url, (async () => {
            const response = await fetch(url, {redirect: 'follow', signal});
            if (!response.ok) throw Error(`Artwork HTTP ${response.status}`);
            const declaredSize = Number(response.headers.get('content-length')) || 0;
            if (declaredSize > 5 * 1024 * 1024) throw Error('Artwork is larger than 5 MB');
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length > 5 * 1024 * 1024) throw Error('Artwork is larger than 5 MB');
            return buffer;
        })());
    }
    return cache.get(url);
}

async function replaceTextFile(filePath, contents) {
    const partialPath = `${filePath}.part`;
    await fsPromises.writeFile(partialPath, contents, 'utf8');
    await fsPromises.rm(filePath, {force: true});
    await fsPromises.rename(partialPath, filePath);
}
