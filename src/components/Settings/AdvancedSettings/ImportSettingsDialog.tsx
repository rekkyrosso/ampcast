import React, {useCallback, useId, useRef} from 'react';
import {Writable} from 'type-fest';
import BackupFile from 'types/BackupFile';
import Listen from 'types/Listen';
import {Logger} from 'utils';
import {audioSettings} from 'services/audio';
import {updateListens} from 'services/localdb/listens';
import playlists from 'services/localdb/playlists';
import pinStore from 'services/pins/pinStore';
import preferences from 'services/preferences';
import stationStore from 'services/internetRadio/stationStore';
import themeStore from 'services/theme/themeStore';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import visualizerStore from 'services/visualizer/visualizerStore';
import Dialog, {DialogButtons, DialogProps, alert, error, showDialog} from 'components/Dialog';
import useImportedSettings from './useImportedSettings';
import './ImportSettingsDialog.scss';

const logger = new Logger('ImportSettingsDialog');

export async function showImportSettingsDialog(backup: BackupFile['backup']): Promise<void> {
    await showDialog(
        (props: DialogProps) => <ImportSettingsDialog {...props} backup={backup} />,
        true
    );
}

export interface ImportSettingsDialogProps extends DialogProps {
    backup: BackupFile['backup'];
}

export default function ImportSettingsDialog({backup, ...props}: ImportSettingsDialogProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const backupEntries = useImportedSettings(backup);

    const handleSubmit = useCallback(async () => {
        try {
            type Backup = BackupFile['backup'];
            const backup: Backup = backupEntries.reduce((data, entry) => {
                if (ref.current?.[entry.key]?.checked) {
                    data[entry.key] = entry.data as any;
                }
                return data;
            }, {} as Writable<Backup>);

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
            if (backup.pins?.length) {
                await pinStore.addPins(backup.pins);
            }
            if (backup.favoriteStations?.length) {
                await stationStore.addFavorite(backup.favoriteStations);
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
            await error('Could not fully process backup file.');
        }
    }, [backupEntries]);

    return (
        <Dialog
            {...props}
            className="import-settings-dialog"
            icon="settings"
            title="Import Settings"
        >
            <form className="backup" method="dialog" onSubmit={handleSubmit} ref={ref}>
                <fieldset>
                    <legend>Import</legend>
                    <ul className="checkbox-list">
                        {backupEntries
                            .filter((entry) => !!entry.data)
                            .map((entry) => (
                                <li key={entry.key}>
                                    <input
                                        id={`${id}-${entry.key}`}
                                        type="checkbox"
                                        name={entry.key}
                                        value={entry.key}
                                        defaultChecked
                                    />
                                    <label htmlFor={`${id}-${entry.key}`}>{entry.title}</label>
                                </li>
                            ))}
                    </ul>
                </fieldset>
                <DialogButtons submitText="Import" />
            </form>
        </Dialog>
    );
}
