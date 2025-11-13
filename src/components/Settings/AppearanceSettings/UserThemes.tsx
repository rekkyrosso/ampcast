import React, {useCallback, useMemo, useRef, useState} from 'react';
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
import importThemesFromFile from './importThemesFromFile';
import './UserThemes.scss';

export default function UserThemes() {
    const listViewRef = useRef<ListViewHandle>(null);
    const renderTheme = useMemo(() => (theme: Theme) => theme.name, []);
    const themes = useUserThemes();
    const [selectedThemes, setSelectedThemes] = useState<readonly Theme[]>([]);
    const [selectedTheme] = selectedThemes;

    const handleRenameClick = useCallback(async () => {
        if (selectedTheme) {
            const oldName = selectedTheme.name;
            let newName = oldName;
            let confirmed = false;
            while (newName && !confirmed) {
                newName = await prompt({
                    icon: 'palette',
                    title: 'Rename theme',
                    label: 'Name',
                    suggestedValue: newName,
                    okLabel: 'Rename',
                    system: true,
                });
                if (newName) {
                    if (newName === oldName) {
                        confirmed = true;
                    } else {
                        confirmed = await confirmOverwriteTheme(newName);
                    }
                }
            }
            if (newName && newName !== oldName && confirmed) {
                await themeStore.renameUserTheme(oldName, newName);
                // Refocus the list box.
                const rowIndex = themes.findIndex((theme) => theme.name === newName);
                if (rowIndex !== -1) {
                    listViewRef.current!.scrollIntoView(rowIndex);
                }
            }
        }
    }, [selectedTheme, themes]);

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
        input.multiple = true;
        input.addEventListener('change', async () => {
            const files = input.files;
            if (files?.length) {
                await importThemesFromFile(files);
            }
        });
        input.click();
    }, []);

    return (
        <form className="user-themes" method="dialog">
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
