import PlaybackState from './PlaybackState';
import Theme from './Theme';

export default interface Snapshot {
    readonly appName: string;
    readonly appVersion: string;
    readonly isAmpcastApp: boolean;
    readonly isElectronApp: boolean;
    readonly isPWA: boolean;
    readonly isLocal: boolean;
    readonly isHttps: boolean;
    readonly isDev: boolean;
    readonly os: string;
    readonly browser: {
        readonly name: string;
        readonly version: string;
    };
    readonly services: {
        readonly visible: string[];
        readonly connected: string[];
        readonly loggedIn: string[];
    };
    readonly playback: {
        readonly isMiniPlayer: boolean;
        readonly isMiniPlayerRemote: boolean;
        readonly state: PlaybackState;
        readonly replayGain: {
            readonly mode: string;
            readonly preAmp: number;
        };
    };
    readonly visualizer: {
        readonly provider: string;
        readonly current: {
            readonly providerId: string;
            readonly name: string;
        } | null;
    };
    readonly theme: Theme & {
        readonly fontSize: number;
        readonly userTheme: boolean;
        readonly edited: boolean;
    };
    readonly usageData: {
        readonly sessionStarted: string;
        readonly sessionStartedAt: number;
        readonly windowStarted: string;
        readonly windowStartedAt: number;
        readonly listenCount: number;
        readonly playlistSize: number;
    };
}
