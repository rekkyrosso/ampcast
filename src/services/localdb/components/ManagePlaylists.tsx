import React, {useCallback, useMemo, useRef, useState} from 'react';
import {prompt} from 'components/Dialog';
import ListBox from 'components/ListView/ListBox';
import {ListViewHandle} from 'components/ListView';
import DialogButtons from 'components/Dialog/DialogButtons';
import {saveTextToFile} from 'utils';
import playlists, {LocalPlaylist} from '../playlists';
import useLocalPlaylists from './useLocalPlaylists';
import confirmDeletePlaylist from './confirmDeletePlaylist';
import confirmOverwritePlaylist from './confirmOverwritePlaylist';
import importPlaylistsFromFile from './importPlaylistsFromFile';
import './ManagePlaylists.scss';

export default function ManagePlaylists() {
    const listViewRef = useRef<ListViewHandle>(null);
    const renderPlaylist = useMemo(
        () => (playlist: LocalPlaylist) => `${playlist.title} (${playlist.trackCount})`,
        []
    );
    const localPlaylists = useLocalPlaylists();
    const [selectedPlaylists, setSelectedPlaylists] = useState<readonly LocalPlaylist[]>([]);
    const [selectedPlaylist] = selectedPlaylists;

    const handleRenameClick = useCallback(async () => {
        if (selectedPlaylist) {
            const oldName = selectedPlaylist.title;
            let newName = oldName;
            let confirmed = false;
            while (newName && !confirmed) {
                newName = await prompt({
                    icon: 'localdb',
                    title: 'Rename playlist',
                    label: 'Name',
                    suggestedValue: oldName,
                    okLabel: 'Rename',
                    system: true,
                });
                if (newName) {
                    if (newName === oldName) {
                        confirmed = true;
                    } else {
                        confirmed = await confirmOverwritePlaylist(newName);
                    }
                }
            }
            if (newName && newName !== oldName && confirmed) {
                await playlists.renamePlaylist(oldName, newName);
                // Refocus the list box.
                const rowIndex = localPlaylists.findIndex((playlist) => playlist.title === newName);
                if (rowIndex !== -1) {
                    listViewRef.current!.scrollIntoView(rowIndex);
                }
            }
        }
    }, [localPlaylists, selectedPlaylist]);

    const handleExportClick = useCallback(async () => {
        if (selectedPlaylist) {
            const name = selectedPlaylist.title;
            const exportedPlaylist = await playlists.getExportedPlaylist(selectedPlaylist);
            if (exportedPlaylist) {
                saveTextToFile(`${name}.json`, JSON.stringify(exportedPlaylist, undefined, 4));
            }
        }
    }, [selectedPlaylist]);

    const handleDeleteClick = useCallback(async () => {
        if (selectedPlaylist) {
            const name = selectedPlaylist.title;
            const confirmed = await confirmDeletePlaylist(name);
            if (confirmed) {
                await playlists.deletePlaylist(selectedPlaylist);
            }
        }
    }, [selectedPlaylist]);

    const handleImportClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/json,.json';
        input.multiple = true;
        input.addEventListener('change', async () => {
            const files = input.files;
            if (files?.length) {
                await importPlaylistsFromFile(files);
            }
        });
        input.click();
    }, []);

    return (
        <form className="manage-playlists" method="dialog">
            <ListBox
                title="Local playlists"
                items={localPlaylists}
                itemKey="src"
                renderItem={renderPlaylist}
                onDelete={handleDeleteClick}
                onSelect={setSelectedPlaylists}
                ref={listViewRef}
            />
            <p className="manage-playlists-buttons">
                <button type="button" onClick={handleRenameClick} disabled={!selectedPlaylist}>
                    Rename…
                </button>
                <button type="button" onClick={handleExportClick} disabled={!selectedPlaylist}>
                    Export…
                </button>
                <button
                    className="manage-playlists-delete"
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={!selectedPlaylist}
                >
                    Delete
                </button>
            </p>
            <fieldset className="manage-playlists-import">
                <legend>Import playlist</legend>
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
