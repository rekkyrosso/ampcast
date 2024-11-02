import Listen from './Listen';
import Preferences from './Preferences';
import Theme from './Theme';
import UserTheme from './UserTheme';
import VisualizerFavorite from './VisualizerFavorite';
import VisualizerSettings from './VisualizerSettings';

export default interface BackupFile {
    readonly ampcastVersion: string;
    readonly ampcastConfig: {
        readonly preferences?: Preferences;
        readonly services?: Record<string, boolean>;
        readonly visualizerSettings?: VisualizerSettings;
        readonly visualizerFavorites?: VisualizerFavorite[];
        readonly userThemes?: UserTheme[];
        readonly theme?: Theme | UserTheme;
        readonly listens?: Listen[];
    };
}
