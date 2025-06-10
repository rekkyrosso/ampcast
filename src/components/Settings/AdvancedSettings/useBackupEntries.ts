import {useMemo} from 'react';
import BackupFile from 'types/BackupFile';
import {t} from 'services/i18n';
import audioSettings from 'services/audio/audioSettings';
import {getListens} from 'services/localdb/listens';
import {getPersonalMediaServices} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import preferences from 'services/preferences';
import themeStore from 'services/theme/themeStore';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import visualizerStore from 'services/visualizer/visualizerStore';

type Backup = BackupFile['backup'];

export interface BackupEntry<K extends keyof Backup> {
    key: K;
    title: string;
    defaultChecked: boolean;
    data: Backup[K];
}

export default function useBackupEntries(): readonly BackupEntry<keyof Backup>[] {
    return useMemo(() => {
        const pins: Backup['pins'] = pinStore.getPins();
        const userThemes: Backup['userThemes'] = themeStore.getUserThemes();
        const visualizerFavorites: Backup['visualizerFavorites'] = visualizerStore.getFavorites();
        const listens: Backup['listens'] = getListens().map((listen) => {
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
                data: {
                    app: {...preferences},
                    audio: {...audioSettings},
                },
            },
            {
                key: 'services',
                title: 'Services',
                defaultChecked: true,
                data: {localStorage: getServicesLocalStorage()},
            },
            {
                key: 'layout',
                title: 'Layout',
                defaultChecked: true,
                data: {localStorage: getLayoutLocalStorage()},
            },
            {
                key: 'theme',
                title: 'Theme',
                defaultChecked: true,
                data: localStorage.getItem('ampcast/theme/current') || '',
            },
            {
                key: 'userThemes',
                title: `User themes (${userThemes.length})`,
                defaultChecked: true,
                data: userThemes,
            },
            {
                key: 'pins',
                title: `Pins (${pins.length})`,
                defaultChecked: true,
                data: pins,
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

function getLayoutLocalStorage(): Record<string, string> {
    const storage: Record<string, string> = {};
    const keys = ['services/fields', 'services/view'].map((key) => `ampcast/${key}`);
    for (const key of keys) {
        storage[key] = localStorage[key];
    }
    return storage;
}

function getServicesLocalStorage(): Record<string, string> {
    const storage: Record<string, string> = {};
    const keys = [
        'scrobbling/noScrobble',
        'scrobbling/options',
        'services/hidden',
        'services/sorting',
        'lookup/preferPersonalMedia',
        'apple/bitrate',
        ...getPersonalMediaServices()
            .map((service) => service.id)
            .map((id) => [`${id}/host`, `${id}/libraries`, `${id}/libraryId`])
            .flat(),
    ].map((key) => `ampcast/${key}`);
    for (const key of keys) {
        storage[key] = localStorage[key];
    }
    return storage;
}
