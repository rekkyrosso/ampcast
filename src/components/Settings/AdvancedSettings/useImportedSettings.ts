import {useMemo} from 'react';
import BackupFile from 'types/BackupFile';
import {t} from 'services/i18n';
import {BackupEntry} from './useExportedSettings';

type Backup = BackupFile['backup'];

export default function useImportedSettings(backup: Backup): readonly BackupEntry<keyof Backup>[] {
    return useMemo(() => {
        return [
            {
                key: 'preferences',
                title: 'Preferences',
                data: backup.preferences,
            },
            {
                key: 'services',
                title: 'Services',
                data: backup.services,
            },
            {
                key: 'layout',
                title: 'Layout',
                data: backup.layout,
            },
            {
                key: 'theme',
                title: 'Theme',
                data: backup.theme,
            },
            {
                key: 'userThemes',
                title: `User themes (${backup.userThemes?.length || 0})`,
                data: backup.userThemes,
            },
            {
                key: 'pins',
                title: `Pins (${backup.pins?.length || 0})`,
                data: backup.pins,
            },
            {
                key: 'favoriteStations',
                title: `My stations (${backup.favoriteStations?.length || 0})`,
                data: backup.favoriteStations,
            },
            {
                key: 'visualizerFavorites',
                title: t(`Visualizer favorites (${backup.visualizerFavorites?.length || 0})`),
                data: backup.visualizerFavorites,
            },
            {
                key: 'visualizerSettings',
                title: 'Visualizer settings',
                data: backup.visualizerSettings,
            },
            {
                key: 'playlists',
                title: `Local playlists (${backup.playlists?.length || 0})`,
                data: backup.playlists,
            },
            {
                key: 'listens',
                title: `Playback history (${(backup.listens?.length || 0).toLocaleString()})`,
                data: backup.listens,
            },
        ];
    }, [backup]);
}
