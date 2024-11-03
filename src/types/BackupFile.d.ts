import Listen from './Listen';
import Preferences from './Preferences';
import Theme from './Theme';
import UserTheme from './UserTheme';
import VisualizerFavorite from './VisualizerFavorite';
import VisualizerSettings from './VisualizerSettings';

export default interface BackupFile {
    readonly ampcastVersion: string;
    readonly backup: {
        readonly preferences?: Preferences;
        readonly services?: {
            readonly localStorage: Record<string, string>;
        };
        readonly pins?: Pin[];
        readonly theme?: Theme | UserTheme;
        readonly userThemes?: UserTheme[];
        readonly visualizerFavorites?: VisualizerFavorite[];
        readonly visualizerSettings?: VisualizerSettings;
        readonly listens?: Listen[];
    };
}
