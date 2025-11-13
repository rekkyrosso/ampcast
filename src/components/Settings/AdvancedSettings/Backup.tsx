import React, {useCallback, useId, useRef} from 'react';
import {Writable} from 'type-fest';
import BackupFile from 'types/BackupFile';
import Listen from 'types/Listen';
import {Logger, saveTextToFile} from 'utils';
import audioSettings from 'services/audio/audioSettings';
import {updateListens} from 'services/localdb/listens';
import playlists from 'services/localdb/playlists';
import pinStore from 'services/pins/pinStore';
import preferences from 'services/preferences';
import themeStore from 'services/theme/themeStore';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import visualizerStore from 'services/visualizer/visualizerStore';
import {alert, error} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import useBackupEntries from './useBackupEntries';
import './Backup.scss';

const logger = new Logger('Backup');

export default function Backup() {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const backupEntries = useBackupEntries();

    const handleExportClick = useCallback(async () => {
        type Backup = BackupFile['backup'];
        const ampcastVersion = __app_version__;
        const backup: Writable<Backup> = backupEntries.reduce((data, entry) => {
            if (ref.current?.[entry.key]?.checked) {
                data[entry.key] = entry.data as any;
            }
            return data;
        }, {} as Writable<Backup>);
        if (backup.playlists) {
            backup.playlists = await playlists.getExportedPlaylists();
        }
        const backupFile: BackupFile = {ampcastVersion, backup};
        saveTextToFile('ampcast-backup.json', JSON.stringify(backupFile, undefined, 2));
    }, [backupEntries]);

    const handleImportClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/json,.json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (file) {
                try {
                    const data = await file.text();
                    const {ampcastVersion, backup}: BackupFile = JSON.parse(data);
                    if (!ampcastVersion || !backup) {
                        await error('Not a valid backup file.');
                        return;
                    }
                    if (backup.preferences) {
                        Object.assign(preferences, backup.preferences.app);
                        Object.assign(audioSettings, backup.preferences.audio);
                    }
                    if (backup.services?.localStorage) {
                        Object.assign(localStorage, backup.services.localStorage);
                    }
                    if (backup.layout?.localStorage) {
                        Object.assign(localStorage, backup.layout.localStorage);
                    }
                    if (backup.pins?.length) {
                        await pinStore.addPins(backup.pins);
                    }
                    if (backup.theme) {
                        localStorage.setItem('ampcast/theme/current', backup.theme);
                    }
                    if (backup.userThemes?.length) {
                        await themeStore.addUserThemes(backup.userThemes);
                    }
                    if (backup.visualizerFavorites?.length) {
                        await visualizerStore.addFavorites(backup.visualizerFavorites);
                    }
                    if (backup.visualizerSettings) {
                        Object.assign(visualizerSettings, backup.visualizerSettings);
                    }
                    if (backup.listens?.length) {
                        await updateListens(
                            backup.listens.map((item: Writable<Listen>) => {
                                // These fields may be in old backup data.
                                delete item.unplayable;
                                delete item.blobUrl;
                                return item;
                            })
                        );
                    }
                    if (backup.playlists?.length) {
                        await playlists.importPlaylists(backup.playlists);
                    }
                    await alert({
                        icon: 'settings',
                        title: 'Import',
                        message: (
                            <>
                                <p>Settings imported.</p>
                                <p>The application will now reload.</p>
                            </>
                        ),
                        system: true,
                    });
                    location.reload();
                } catch (err) {
                    logger.error(err);
                    await error('Could not fully load backup file.');
                }
            }
        });
        input.click();
    }, []);

    return (
        <form className="backup" method="dialog" ref={ref}>
            <fieldset>
                <legend>Export</legend>
                <ul className="checkbox-list">
                    {backupEntries.map((entry) => (
                        <li key={entry.key}>
                            <input
                                id={`${id}-${entry.key}`}
                                type="checkbox"
                                name={entry.key}
                                value={entry.key}
                                defaultChecked={entry.defaultChecked}
                            />
                            <label htmlFor={`${id}-${entry.key}`}>{entry.title}</label>
                        </li>
                    ))}
                </ul>
                <p>
                    <button type="button" onClick={handleExportClick}>
                        Export…
                    </button>
                </p>
            </fieldset>
            <fieldset>
                <legend>Import</legend>
                <p>
                    <button type="button" onClick={handleImportClick}>
                        Import…
                    </button>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
