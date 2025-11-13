import type {ExportedPlaylist} from 'services/localdb/playlists';
import AudioSettings from './AudioSettings';
import Listen from './Listen';
import Preferences from './Preferences';
import UserTheme from './UserTheme';
import VisualizerFavorite from './VisualizerFavorite';
import VisualizerSettings from './VisualizerSettings';

export default interface BackupFile {
    readonly ampcastVersion: string;
    readonly backup: {
        readonly preferences?: {
            readonly app: Preferences;
            readonly audio: AudioSettings;
        };
        readonly services?: {
            readonly localStorage: Record<string, string>;
        };
        readonly layout?: {
            readonly localStorage: Record<string, string>;
        };
        readonly pins?: readonly Pin[];
        readonly theme?: string;
        readonly userThemes?: readonly UserTheme[];
        readonly visualizerFavorites?: readonly VisualizerFavorite[];
        readonly visualizerSettings?: VisualizerSettings;
        readonly listens?: readonly Listen[];
        readonly playlists?: readonly ExportedPlaylist[];
    };
}
