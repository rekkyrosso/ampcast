import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Theme from 'types/Theme';
import themeStore from 'services/theme/themeStore';
import {prompt} from 'components/Dialog';
import ListBox from 'components/ListView/ListBox';
import {ListViewHandle} from 'components/ListView';
import DialogButtons from 'components/Dialog/DialogButtons';
import {saveTextToFile} from 'utils';
import useUserThemes from './useUserThemes';
import confirmDeleteTheme from './confirmDeleteTheme';
import confirmOverwriteTheme from './confirmOverwriteTheme';
import importThemeFromFile from './importThemeFromFile';
import './UserThemes.scss';

export default function UserThemes() {
    const listViewRef = useRef<ListViewHandle>(null);
    const renderTheme = useMemo(() => (theme: Theme) => theme.name, []);
    const themes = useUserThemes();
    const [renamed, setRenamed] = useState('');
    const [selectedThemes, setSelectedThemes] = useState<readonly Theme[]>([]);
    const [selectedTheme] = selectedThemes;

    useEffect(() => {
        if (renamed) {
            const rowIndex = themes.findIndex((theme) => theme.name === renamed);
            if (rowIndex !== -1) {
                listViewRef.current!.scrollIntoView(rowIndex);
                setRenamed('');
            }
        }
    }, [themes, renamed]);

    const handleRenameClick = useCallback(async () => {
        if (selectedTheme) {
            const oldName = selectedTheme.name;
            const newName = await prompt({
                icon: 'palette',
                title: 'My Themes',
                label: 'Name',
                suggestedValue: oldName,
                okLabel: 'Rename',
                system: true,
            });
            if (newName && newName !== oldName) {
                const confirmed = await confirmOverwriteTheme(newName);
                if (confirmed) {
                    await themeStore.renameUserTheme(oldName, newName);
                    setRenamed(newName);
                }
            }
        }
    }, [selectedTheme]);

    const handleExportClick = useCallback(async () => {
        if (selectedTheme) {
            const name = selectedTheme.name;
            const userTheme = themeStore.getUserTheme(name);
            if (userTheme) {
                saveTextToFile(`${name}.json`, JSON.stringify(userTheme, undefined, 4));
            }
        }
    }, [selectedTheme]);

    const handleDeleteClick = useCallback(async () => {
        if (selectedTheme) {
            const name = selectedTheme.name;
            const confirmed = await confirmDeleteTheme(name);
            if (confirmed) {
                await themeStore.removeUserTheme(name);
            }
        }
    }, [selectedTheme]);

    const handleImportClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/json,.json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (file) {
                await importThemeFromFile(file);
            }
        });
        input.click();
    }, []);

    return (
        <form className="user-themes" method="dialog">
            <h3>My themes:</h3>
            <ListBox<Theme>
                title="My themes"
                items={themes}
                itemKey="name"
                renderItem={renderTheme}
                onDelete={handleDeleteClick}
                onSelect={setSelectedThemes}
                ref={listViewRef}
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
                <legend>Import theme</legend>
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
