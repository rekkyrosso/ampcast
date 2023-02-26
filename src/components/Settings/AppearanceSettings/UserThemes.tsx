import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Theme from 'types/Theme';
import themeStore from 'services/theme/themeStore';
import {prompt} from 'components/Dialog';
import ListBox from 'components/ListView/ListBox';
import {ListViewHandle} from 'components/ListView';
import {saveTextToFile} from 'utils';
import useUserThemes from './useUserThemes';
import confirmDeleteTheme from './confirmDeleteTheme';
import confirmOverwriteTheme from './confirmOverwriteTheme';
import importThemeFromFile from './importThemeFromFile';
import './UserThemes.scss';

export default function UserThemes() {
    const listViewRef = useRef<ListViewHandle>(null);
    const renderTheme = useMemo(() => (theme: Theme) => theme.name, []);
    const fileRef = useRef<HTMLInputElement>(null);
    const themes = useUserThemes();
    const [renamed, setRenamed] = useState('');
    const [selectedThemes, setSelectedThemes] = useState<readonly Theme[]>([]);
    const [selectedTheme] = selectedThemes;

    useEffect(() => {
        if (renamed) {
            const rowIndex = themes.findIndex((theme) => theme.name === renamed);
            if (rowIndex !== -1) {
                listViewRef.current!.selectAt(rowIndex);
                setRenamed('');
            }
        }
    }, [themes, renamed]);

    const handleRenameClick = useCallback(async () => {
        if (selectedTheme) {
            const oldName = selectedTheme.name;
            const newName = await prompt({
                title: 'My themes',
                suggestedValue: oldName,
                okLabel: 'Rename',
                system: true,
            });
            if (newName) {
                const confirmed = await confirmOverwriteTheme(newName);
                if (confirmed) {
                    await themeStore.rename(oldName, newName);
                    setRenamed(newName);
                }
            }
        }
    }, [selectedTheme]);

    const handleExportClick = useCallback(async () => {
        if (selectedTheme) {
            const name = selectedTheme.name;
            const theme = themeStore.getUserTheme(name);
            if (theme) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const {userTheme, ...data} = theme;
                saveTextToFile(`${name}.json`, JSON.stringify(data, undefined, 4));
            }
        }
    }, [selectedTheme]);

    const handleDeleteClick = useCallback(async () => {
        if (selectedTheme) {
            const name = selectedTheme.name;
            const confirmed = await confirmDeleteTheme(name);
            if (confirmed) {
                await themeStore.remove(name);
                setSelectedThemes([]);
            }
        }
    }, [selectedTheme]);

    const handleImportClick = useCallback(() => {
        fileRef.current!.click();
    }, []);

    const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target!.files?.[0];
        if (file) {
            await importThemeFromFile(file);
            event.target!.value = '';
        }
    }, []);

    return (
        <form className="user-themes" method="dialog">
            <h3>My themes:</h3>
            <ListBox<Theme>
                items={themes}
                itemKey="name"
                renderItem={renderTheme}
                onDelete={handleDeleteClick}
                onSelect={setSelectedThemes}
                listViewRef={listViewRef}
            />
            <p className="user-themes-buttons">
                <button type="button" onClick={handleRenameClick} disabled={!selectedTheme}>
                    Rename…
                </button>
                <button type="button" onClick={handleExportClick} disabled={!selectedTheme}>
                    Export…
                </button>
                <button
                    className="user-themes-delete"
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={!selectedTheme}
                >
                    Delete
                </button>
            </p>
            <fieldset className="user-themes-import">
                <legend>Import themes</legend>
                <p>
                    <input
                        type="file"
                        accept="text/json,.json"
                        onChange={handleFileImport}
                        ref={fileRef}
                    />
                    <button type="button" onClick={handleImportClick}>
                        Import…
                    </button>
                </p>
            </fieldset>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
