import {useMemo} from 'react';
import BackupFile from 'types/BackupFile';
import {t} from 'services/i18n';
import {getListens} from 'services/localdb/listens';
import {getHiddenSources} from 'services/mediaServices/servicesSettings';
import preferences from 'services/preferences';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import visualizerStore from 'services/visualizer/visualizerStore';

export interface BackupEntry {
    key: keyof BackupFile['ampcastConfig'];
    title: string;
    defaultChecked: boolean;
    data: any;
}

export default function useBackupEntries(): readonly BackupEntry[] {
    return useMemo(() => {
        const services = getHiddenSources();
        const userThemes = themeStore.getUserThemes();
        const visualizerFavorites = visualizerStore.getFavorites();
        const listens = getListens().map((listen) => {
            if (!listen.lastfmScrobbledAt || !listen.listenbrainzScrobbledAt) {
                return {...listen, lastfmScrobbledAt: -1, listenbrainzScrobbledAt: -1};
            }
            return listen;
        });

        return [
            {
                key: 'preferences',
                title: 'Preferences',
                defaultChecked: true,
                data: {...preferences},
            },
            {key: 'services', title: 'Services', defaultChecked: true, data: services},
            {key: 'theme', title: 'Theme', defaultChecked: true, data: theme},
            {
                key: 'userThemes',
                title: `User themes (${userThemes.length})`,
                defaultChecked: true,
                data: userThemes,
            },
            {
                key: 'visualizerFavorites',
                title: t(`Visualizer favorites (${visualizerFavorites.length})`),
                defaultChecked: true,
                data: visualizerFavorites,
            },
            {
                key: 'visualizerSettings',
                title: 'Visualizer settings',
                defaultChecked: true,
                data: {...visualizerSettings},
            },
            {
                key: 'listens',
                title: `Listening history (${listens.length})`,
                defaultChecked: false,
                data: listens,
            },
        ];
    }, []);
}
