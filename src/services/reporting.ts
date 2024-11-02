import ErrorReport from 'types/ErrorReport';
import ServiceType from 'types/ServiceType';
import Snapshot from 'types/Snapshot';
import {isMiniPlayer, browser, getElapsedTimeText, Logger} from 'utils';
import audioSettings from 'services/audio/audioSettings';
import {getListens} from 'services/localdb/listens';
import {getPlaybackState} from 'services/mediaPlayback/playback';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import {getServiceFromSrc, getServices} from 'services/mediaServices';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import playlist from 'services/playlist';
import session from 'services/session';
import theme from 'services/theme';
import {getCurrentVisualizer} from 'services/visualizer';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export function createErrorReport(
    error: any,
    reportedBy: ErrorReport['reportedBy'],
    reportingId = ''
): ErrorReport {
    return {
        reportedBy,
        reportingId,
        error: createError(error),
        snapshot: createSnapshot(),
    };
}

export function createSnapshot(): Snapshot {
    const currentVisualizer = getCurrentVisualizer();
    const services = getServices();
    const playbackState = structuredClone(getPlaybackState());
    const currentItem = playbackState.currentItem;
    if (currentItem) {
        const service = getServiceFromSrc(currentItem);
        if (service?.serviceType === ServiceType.PersonalMedia) {
            delete (currentItem as any).externalUrl;
        }
        delete (currentItem as any).thumbnails;
    }
    const themeData = theme.toJSON();

    return {
        appName: __app_name__,
        appVersion: __app_version__,
        isAmpcastApp: location.hostname === 'ampcast.app',
        isElectronApp: browser.isElectron,
        isPWA: matchDisplayMode('standalone') || matchDisplayMode('window-controls-overlay'),
        isLocal: location.hostname === 'localhost',
        isHttps: location.protocol === 'https:',
        isDev: __dev__,
        os: browser.os,
        browser: {
            name: browser.displayName,
            version: browser.version,
        },
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
        playback: {
            isMiniPlayer: isMiniPlayer,
            isMiniPlayerRemote: miniPlayer.active,
            state: playbackState,
            replayGain: {
                mode: audioSettings.replayGainMode,
                preAmp: audioSettings.replayGainPreAmp,
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
            ...themeData,
            userTheme: theme.userTheme,
            edited: theme.edited,
        },
        usageData: {
            windowStarted: getElapsedTimeText(Logger.startedAt),
            sessionStarted: getElapsedTimeText(session.startedAt),
            windowStartedAt: Logger.startedAt,
            sessionStartedAt: session.startedAt,
            listenCount: getListens().length,
            playlistSize: playlist.size,
        },
    };
}

function createError(error: any): ErrorReport['error'] {
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

function matchDisplayMode(displayMode: string): boolean {
    return matchMedia(`(display-mode:${displayMode})`).matches;
}
