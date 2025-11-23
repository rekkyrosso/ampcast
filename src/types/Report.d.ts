import type {ReadableLog} from 'utils/Logger';
import ErrorReport from './ErrorReport';

export default interface Report {
    readonly ampcastVersion: string;
    readonly client: {
        readonly isAmpcastApp: boolean;
        readonly isElectron: boolean;
        readonly isPWA: boolean;
        readonly isHttps: boolean;
        readonly isLocalhost: boolean;
        readonly isDev: boolean;
        readonly os: string;
        readonly browserName: string;
        readonly browserVersion: string;
    };
    readonly session: {
        readonly sessionStarted: string;
        readonly sessionStartedAt: number;
        readonly windowStarted: string;
        readonly windowStartedAt: number;
    };
    readonly stats: {
        readonly listens: number;
        readonly playlistItems: number;
        readonly services: {
            readonly visible: string[];
            readonly connected: string[];
            readonly loggedIn: string[];
        };
        readonly theme: string;
        readonly userThemes: number;
        readonly visualizerFavorites: number;
    };
    readonly errorReport?: ErrorReport;
    readonly logs?: readonly ReadableLog[];
}
