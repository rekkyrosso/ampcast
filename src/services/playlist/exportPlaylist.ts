import MediaItem from 'types/MediaItem';
import ampcastElectron from 'services/ampcastElectron';
import preferences from 'services/preferences';
import {getServiceFromSrc} from 'services/mediaServices';
import {alert, select} from 'components/Dialog';
import {
    finishPlaylistExport,
    setPlaylistExportQueueLength,
    startPlaylistExport,
    updatePlaylistExport,
} from './playlistExportProgress';

interface ExportJob {
    name: string;
    run: (batchId: string, destination?: string) => Promise<string>;
}

const exportQueue: ExportJob[] = [];
let processingQueue = false;

export default async function exportPlaylist(
    items: readonly MediaItem[],
    name = 'Ampcast playlist'
): Promise<void> {
    if (!ampcastElectron) {
        await alert({
            title: 'Export playlist',
            message: 'Playlist export is available in the Ampcast desktop app.',
        });
        return;
    }
    const electron = ampcastElectron;
    let selectedBitRate = String(preferences.defaultExportBitRate);
    if (preferences.askExportBitRate) {
        selectedBitRate = await select({
            icon: 'jellyfin',
            title: 'Export playlist to MP3',
            message: 'Choose the MP3 quality for exported tracks.',
            options: {
                '128': 'MP3 — 128 kbps',
                '192': 'MP3 — 192 kbps',
                '256': 'MP3 — 256 kbps',
                '320': 'MP3 — 320 kbps',
            },
            suggestedValue: selectedBitRate,
            okLabel: 'Choose destination',
        });
        if (!selectedBitRate) {
            return;
        }
    }
    const bitRate = Number(selectedBitRate) * 1000;

    const tracks = items.flatMap((item) => {
        const service = getServiceFromSrc(item);
        if (!service?.getExportUrl) {
            return [];
        }
        try {
            const outputName = item.fileName
                ? item.fileName.replace(/\.[^./\\]+$/, '')
                : item.title;
            const url = service.getExportUrl(item, {format: 'mp3', bitRate});
            return [
                {
                    id: item.src,
                    url,
                    artworkUrl: getAuthenticatedArtworkUrl(url, item),
                    fileName: `${outputName}.mp3`,
                    title: item.title,
                    artist: item.artists?.join(', ') || item.albumArtist,
                    albumArtist: item.albumArtist,
                    album: item.album,
                    track: item.track,
                    disc: item.disc,
                    year: item.year,
                    duration: item.duration,
                },
            ];
        } catch {
            return [];
        }
    });

    const concurrency = preferences.exportConcurrency;
    enqueueExport({
        name,
        run: async (batchId, destination) => {
            try {
                const operationId = crypto.randomUUID();
                startPlaylistExport(operationId, name, tracks.length, exportQueue.length);
                const task = electron.exportPlaylist(
                    {
                        operationId,
                        batchId,
                        bitRate,
                        name,
                        concurrency,
                        destination,
                        tracks,
                        skipped: items.length - tracks.length,
                    },
                    updatePlaylistExport
                );
                const result = await task.finally(() => finishPlaylistExport(operationId));
                if (result.canceled) {
                    return `${name}: canceled after ${result.exported} completed track${
                        result.exported === 1 ? '' : 's'
                    }.`;
                }

                const details = [
                    `${name}: ${result.exported} track${
                        result.exported === 1 ? '' : 's'
                    } exported.`,
                    result.skipped
                        ? `${result.skipped} unsupported track${
                              result.skipped === 1 ? '' : 's'
                          } skipped.`
                        : '',
                    result.errors.length
                        ? `${result.errors.length} download${
                              result.errors.length === 1 ? '' : 's'
                          } failed.`
                        : '',
                    result.errors[0] || '',
                ].filter(Boolean);
                return details.join(' ');
            } catch (err) {
                return `${name}: failed — ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    });
}

function getAuthenticatedArtworkUrl(exportUrl: string, item: MediaItem): string | undefined {
    const thumbnail = item.thumbnails?.find(({width}) => width >= 480) || item.thumbnails?.at(-1);
    if (!thumbnail) {
        return undefined;
    }
    try {
        const artworkUrl = new URL(thumbnail.url);
        const apiKey = new URL(exportUrl).searchParams.get('api_key');
        if (apiKey) {
            artworkUrl.searchParams.set('api_key', apiKey);
        }
        artworkUrl.searchParams.set('format', 'jpg');
        artworkUrl.searchParams.set('quality', '90');
        return artworkUrl.href;
    } catch {
        return undefined;
    }
}

function enqueueExport(job: ExportJob): void {
    exportQueue.push(job);
    setPlaylistExportQueueLength(exportQueue.length);
    if (!processingQueue) {
        void processExportQueue();
    }
}

async function processExportQueue(): Promise<void> {
    processingQueue = true;
    const batchId = crypto.randomUUID();
    const summaries: string[] = [];
    try {
        let destination: string | undefined;
        if (preferences.showSimplifiedExportTarget) {
            let targets;
            try {
                targets = await ampcastElectron!.getRemovableExportTargets();
            } catch (err) {
                exportQueue.length = 0;
                setPlaylistExportQueueLength(0);
                await alert({
                    title: 'USB drive search failed',
                    message:
                        err instanceof Error
                            ? err.message
                            : 'Windows did not return the removable drive list.',
                });
                return;
            }
            if (!targets.length) {
                exportQueue.length = 0;
                setPlaylistExportQueueLength(0);
                await alert({
                    title: 'No USB drives found',
                    message: 'Connect a removable USB drive and try the export again.',
                });
                return;
            }
            const options = Object.fromEntries(
                targets.map((target) => [
                    target.path,
                    `${target.label} (${formatBytes(target.freeBytes)} free)`,
                ])
            );
            destination = await select({
                icon: 'folder',
                title: 'Export playlist to MP3',
                message: 'Choose a removable USB drive.',
                options,
                suggestedValue: targets[0].path,
                okLabel: 'Export here',
            });
            if (!destination) {
                exportQueue.length = 0;
                setPlaylistExportQueueLength(0);
                return;
            }
        }
        while (exportQueue.length) {
            const job = exportQueue.shift()!;
            setPlaylistExportQueueLength(exportQueue.length);
            summaries.push(await job.run(batchId, destination));
        }
    } finally {
        processingQueue = false;
        ampcastElectron?.clearPlaylistExportBatch(batchId);
    }
    await alert({
        title: summaries.length === 1 ? 'Playlist export complete' : 'Playlist exports complete',
        message: summaries,
    });
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown space';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unit;
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
