import ErrorReport from 'types/ErrorReport';
import LogLevel from 'types/LogLevel';
import {ReadableLog} from 'types/Log';
import MediaObject from 'types/MediaObject';
import PlaybackState from 'types/PlaybackState';
import Report from 'types/Report';
import Snapshot from 'types/Snapshot';
import {Logger, browser, copyToClipboard, getElapsedTimeText, isMiniPlayer} from 'utils';
import audio, {audioSettings} from 'services/audio';
import {getReadableErrorMessage} from 'services/errors';
import {getListens} from 'services/localdb/listens';
import mediaPlayback from 'services/mediaPlayback';
import {getPlaybackState} from 'services/mediaPlayback/playback';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import {getServices} from 'services/mediaServices';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import playlist from 'services/playlist';
import session from 'services/session';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import {getCurrentVisualizer} from 'services/visualizer';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import visualizerStore from 'services/visualizer/visualizerStore';

export function copyErrorReportToClipboard(
    error: any,
    reportedBy: ErrorReport['reportedBy'],
    reportingId?: string
): Promise<void> {
    const errorReport = createErrorReport(error, reportedBy, reportingId);
    const logs = getReadableLogs(10);
    return copyReportToClipboard({errorReport, logs});
}

export function copyLogsToClipboard(): Promise<void> {
    const logs = getReadableLogs();
    return copyReportToClipboard({logs});
}

export function copyMediaObjectToClipboard(item: MediaObject): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {pager, parentFolder, ...data} = item as any;
    return copyToClipboard(data);
}

export function createErrorReport(
    error: any,
    reportedBy: ErrorReport['reportedBy'],
    reportingId = ''
): ErrorReport {
    return {
        reportedBy,
        reportingId,
        error: getReportableError(error),
    };
}

function copyReportToClipboard(entries: Pick<Report, 'errorReport' | 'logs'>): Promise<void> {
    const services = getServices();
    const report: Report = {
        ampcastVersion: __app_version__,
        client: {
            isAmpcastApp: browser.isAmpcastApp,
            isElectron: browser.isElectron,
            isPWA: matchDisplayMode('standalone') || matchDisplayMode('window-controls-overlay'),
            isLocalhost: location.hostname === 'localhost',
            isHttps: location.protocol === 'https:',
            isDev: __dev__,
            os: browser.os,
            browserName: browser.displayName,
            browserVersion: browser.version,
        },
        ...entries,
        session: {
            windowStarted: getElapsedTimeText(Logger.startedAt),
            sessionStarted: getElapsedTimeText(session.startedAt),
            windowStartedAt: Logger.startedAt,
            sessionStartedAt: session.startedAt,
        },
        stats: {
            listens: getListens().length,
            playlistItems: playlist.size,
            services: {
                visible: services
                    .filter((service) => isSourceVisible(service))
                    .map((service) => service.id),
                connected: services
                    .filter((service) => service.isConnected())
                    .map((service) => service.id),
                loggedIn: services
                    .filter((service) => service.isLoggedIn())
                    .map((service) => service.id),
            },
            theme: theme.userTheme
                ? '(user theme)'
                : `${theme.name}${theme.edited ? ' (edited)' : ''}`,
            userThemes: themeStore.getUserThemes().length,
            visualizerFavorites: visualizerStore.getFavorites().length,
        },
        snapshot: getSnapshot(),
    };
    return copyToClipboard(report);
}

function getReportableError(error: any): ErrorReport['error'] {
    const message = getReadableErrorMessage(error);
    if (error instanceof Response) {
        const response = {
            status: error.status,
            statusText: error.statusText,
        };
        return {message, response};
    }
    if (error instanceof Error) {
        const stack = String(error.stack || '').split(/\n/);
        return {message, stack};
    }
    return {message};
}

function getReadableLogs(count = Logger.logs.length): readonly ReadableLog[] {
    const readableLogLevel: Record<LogLevel, 'info' | 'log' | 'Warn' | 'ERROR'> = {
        [LogLevel.Info]: 'info',
        [LogLevel.Log]: 'log',
        [LogLevel.Warn]: 'Warn',
        [LogLevel.Error]: 'ERROR',
    };
    return Logger.logs.slice(0, count).map((entry) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {id, level, message, timeStamp, ...log} = entry;
        const label = readableLogLevel[level];
        return {timeStamp, [label]: message, ...log} as ReadableLog;
    });
}

function getReportableMediaItem({
    currentItem,
}: PlaybackState): Snapshot['playback']['state']['currentItem'] {
    if (currentItem) {
        const {
            src,
            duration,
            itemType,
            linearType,
            mediaType,
            playbackType,
            lookupStatus,
            startTime,
            badge,
            container,
            bitRate,
        } = currentItem;
        return {
            src,
            duration,
            itemType,
            linearType,
            mediaType,
            playbackType,
            lookupStatus,
            startTime,
            badge,
            container,
            bitRate,
            blob: !!currentItem.blob,
            blobUrl: !!currentItem.blobUrl,
        };
    } else {
        return null;
    }
}

function getSnapshot(): Snapshot {
    const currentVisualizer = getCurrentVisualizer();
    const playbackState = getPlaybackState();

    return {
        audio: {
            volume: audio.volume,
            replayGain: audio.replayGain,
            settings: {
                replayGain: {
                    mode: audioSettings.replayGainMode,
                    preAmp: audioSettings.replayGainPreAmp,
                },
            },
            streamingSupported: audio.streamingSupported,
        },
        playback: {
            volume: mediaPlayback.volume,
            isMiniPlayer: isMiniPlayer,
            isMiniPlayerRemote: miniPlayer.active,
            state: {
                ...playbackState,
                currentItem: getReportableMediaItem(playbackState),
            },
        },
        visualizer: {
            provider: visualizerSettings.provider,
            current: {
                providerId: currentVisualizer.providerId,
                name: currentVisualizer.name,
            },
        },
        theme: {
            fontSize: theme.fontSize,
            ...theme.toJSON(),
            userTheme: theme.userTheme,
            edited: theme.edited,
        },
    };
}

function matchDisplayMode(displayMode: string): boolean {
    return matchMedia(`(display-mode:${displayMode})`).matches;
}
