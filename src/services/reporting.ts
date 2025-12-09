import ErrorReport from 'types/ErrorReport';
import MediaObject from 'types/MediaObject';
import PlaybackState from 'types/PlaybackState';
import Report from 'types/Report';
import Snapshot from 'types/Snapshot';
import {browser, copyToClipboard, getElapsedTimeText, isMiniPlayer} from 'utils';
import Logger, {LogLevel, ReadableLog} from 'utils/Logger';
import audio from 'services/audio';
import {audioSettings} from 'services/audio';
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
    return copyReportToClipboard({errorReport});
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
        snapshot: getSnapshot(),
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
    };
    return copyToClipboard(report);
}

function getReportableError(error: any): ErrorReport['error'] {
    return error
        ? {
              message:
                  typeof error === 'string'
                      ? error
                      : typeof error.message === 'string'
                      ? error.message
                      : String(error),
              httpStatus: error.status,
              httpStatusText: error.statusText,
              stack: String(error.stack || '').split(/\n\s*/),
          }
        : null;
}

function getReadableLogs(): readonly ReadableLog[] {
    const readableLogLevel: Record<LogLevel, 'info' | 'log' | 'Warn' | 'ERROR'> = {
        [LogLevel.Info]: 'info',
        [LogLevel.Log]: 'log',
        [LogLevel.Warn]: 'Warn',
        [LogLevel.Error]: 'ERROR',
    };
    return Logger.logs.map((entry) => {
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
