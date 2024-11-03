import React, {useCallback, useId, useRef} from 'react';
import {Writable} from 'type-fest';
import BackupFile from 'types/BackupFile';
import {Logger, saveTextToFile} from 'utils';
import {updateListens} from 'services/localdb/listens';
import pinStore from 'services/pins/pinStore';
import preferences from 'services/preferences';
import theme from 'services/theme';
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
        const ampcastVersion = __app_version__;
        const ampcastConfig: BackupFile['backup'] = backupEntries.reduce((data, entry) => {
            if (ref.current?.[entry.key]?.checked) {
                data[entry.key] = entry.data;
            }
            return data;
        }, {} as Writable<BackupFile['backup']>);
        const backupFile: BackupFile = {ampcastVersion, backup: ampcastConfig};
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
                        Object.assign(preferences, backup.preferences);
                    }
                    if (backup.services) {
                        Object.assign(localStorage, backup.services.localStorage);
                    }
                    if (backup.userThemes) {
                        await themeStore.addUserThemes(backup.userThemes);
                    }
                    if (backup.visualizerFavorites) {
                        await visualizerStore.addFavorites(backup.visualizerFavorites);
                    }
                    if (backup.visualizerSettings) {
                        Object.assign(visualizerSettings, backup.visualizerSettings);
                    }
                    if (backup.pins) {
                        await pinStore.addPins(backup.pins);
                    }
                    if (backup.listens) {
                        await updateListens(backup.listens);
                    }
                    await alert({
                        icon: 'settings',
                        title: 'Import',
                        message: (
                            <>
                                <p>Settings successfully imported.</p>
                                <p>The application will now reload.</p>
                            </>
                        ),
                        system: true,
                    });
                    if (backup.theme) {
                        theme.apply(backup.theme);
                        theme.save();
                    }
                    location.reload();
                } catch (err) {
                    logger.error(err);
                    await error('Could not load backup file.');
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
