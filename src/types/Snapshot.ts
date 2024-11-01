import PlaybackState from './PlaybackState';
import Theme from './Theme';

export default interface Snapshot {
    appName: string;
    appVersion: string;
    isAmpcastApp: boolean;
    isElectronApp: boolean;
    isPWA: boolean;
    isLocal: boolean;
    isHttps: boolean;
    isDev: boolean;
    os: string;
    browser: {
        name: string;
        version: string;
    };
    services: {
        visible: string[];
        connected: string[];
        loggedIn: string[];
    };
    playback: {
        isMiniPlayer: boolean;
        isMiniPlayerRemote: boolean;
        state: PlaybackState;
        replayGain: {
            mode: string;
            preAmp: number;
        };
    };
    visualizer: {
        provider: string;
        current: {
            providerId: string;
            name: string;
        } | null;
    };
    theme: Theme & {
        fontSize: number;
        userTheme: boolean;
        edited: boolean;
    };
    usageData: {
        sessionStarted: string;
        sessionStartedAt: number;
        windowStarted: string;
        windowStartedAt: number;
        listenCount: number;
        playlistSize: number;
    };
}
