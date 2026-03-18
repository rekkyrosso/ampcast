import React, {useCallback, useId, useRef} from 'react';
import {Writable} from 'type-fest';
import BackupFile from 'types/BackupFile';
import {Logger, saveTextToFile} from 'utils';
import playlists from 'services/localdb/playlists';
import Button from 'components/Button';
import {DialogButtons, error} from 'components/Dialog';
import useExportedSettings from './useExportedSettings';
import {showImportSettingsDialog} from './ImportSettingsDialog';
import './Backup.scss';

const logger = new Logger('Backup');

export default function Backup() {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const backupEntries = useExportedSettings();

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
                    await showImportSettingsDialog(backup);
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
                    <Button type="button" onClick={handleExportClick}>
                        Export…
                    </Button>
                </p>
            </fieldset>
            <fieldset>
                <legend>Import</legend>
                <p>
                    <Button type="button" onClick={handleImportClick}>
                        Import…
                    </Button>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
