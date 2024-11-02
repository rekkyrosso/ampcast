import React, {useCallback, useId, useRef} from 'react';
import {Writable} from 'type-fest';
import BackupFile from 'types/BackupFile';
import {saveTextToFile} from 'utils';
import {updateListens} from 'services/localdb/listens';
import {setHiddenSources} from 'services/mediaServices/servicesSettings';
import preferences from 'services/preferences';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import visualizerStore from 'services/visualizer/visualizerStore';
import {alert, error} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import useBackupEntries from './useBackupEntries';
import './Backup.scss';

export default function Backup() {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const backupEntries = useBackupEntries();

    const handleExportClick = useCallback(async () => {
        const ampcastVersion = __app_version__;
        const ampcastConfig: BackupFile['ampcastConfig'] = backupEntries.reduce((data, entry) => {
            if (ref.current?.[entry.key]?.checked) {
                data[entry.key] = entry.data;
            }
            return data;
        }, {} as Writable<BackupFile['ampcastConfig']>);
        const backupFile: BackupFile = {ampcastVersion, ampcastConfig};
        saveTextToFile('ampcast.json', JSON.stringify(backupFile, undefined, 2));
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
                    const {ampcastVersion, ampcastConfig}: BackupFile = JSON.parse(data);
                    if (!ampcastVersion || !ampcastConfig) {
                        await error('Not a valid settings file.');
                        return;
                    }
                    if (ampcastConfig.preferences) {
                        Object.assign(preferences, ampcastConfig.preferences);
                    }
                    if (ampcastConfig.services) {
                        setHiddenSources(ampcastConfig.services);
                    }
                    if (ampcastConfig.theme) {
                        theme.apply(ampcastConfig.theme);
                        theme.save();
                    }
                    if (ampcastConfig.userThemes) {
                        await themeStore.addUserThemes(ampcastConfig.userThemes);
                    }
                    if (ampcastConfig.visualizerFavorites) {
                        await visualizerStore.addFavorites(ampcastConfig.visualizerFavorites);
                    }
                    if (ampcastConfig.visualizerSettings) {
                        Object.assign(visualizerSettings, ampcastConfig.visualizerSettings);
                    }
                    if (ampcastConfig.listens) {
                        await updateListens(ampcastConfig.listens);
                    }
                    alert({
                        icon: 'settings',
                        title: 'Import',
                        message: 'Settings successfully imported.',
                        system: true,
                    });
                } catch (err) {
                    console.error(err);
                    await error('Could not load settings.');
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
