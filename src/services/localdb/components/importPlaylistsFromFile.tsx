import React from 'react';
import {groupBy, Logger, partition} from 'utils';
import {alert, error, prompt, select} from 'components/Dialog';
import playlists, {ExportedPlaylist} from '../playlists';
import confirmOverwritePlaylist from './confirmOverwritePlaylist';

const logger = new Logger('importPlaylistsFromFile');

interface ImportedFile {
    fileName: string;
    data: ExportedPlaylist | null;
}

type ResultType = 'success' | 'error' | 'skipped';

export default async function importPlaylistsFromFile(files: FileList): Promise<void> {
    const parsedFiles = await Promise.all([...files].map((file) => parseFile(file)));
    const [validFiles, invalidFiles] = partition(parsedFiles, (file) => !!file.data);
    if (files.length === 1) {
        if (invalidFiles.length === 1) {
            error('Not a valid playlist.');
        } else {
            const playlist = validFiles[0].data!;
            const result = await importPlaylist(validFiles[0]);
            if (result === 'success') {
                alert({
                    icon: 'localdb',
                    title: 'Import complete',
                    message: `Playlist '${playlist.title}' imported.`,
                    system: true,
                });
            } else if (result === 'error') {
                error('Could not load playlist.');
            }
        }
    } else {
        const additions: ImportedFile[] = [];
        const [duplicates, newFiles] = partition(
            validFiles,
            (file) => !!playlists.getLocalPlaylistByName(file.data!.title)
        );
        const newFilesGroupedByName = groupBy(newFiles, (file) => file.data!.title);
        Object.keys(newFilesGroupedByName).forEach((name) => {
            const group = newFilesGroupedByName[name];
            while (group.length > 1) {
                const file = group.pop()!;
                duplicates.push(file);
            }
            additions.push(group[0]);
        });
        let results: ResultType[] = [];
        if (duplicates.length < 2) {
            results = await Promise.all(validFiles.map((file) => importPlaylist(file)));
        } else {
            const decision = await select({
                icon: 'localdb',
                title: 'Replace or skip playlists',
                message: (
                    <>
                        <p>{duplicates.length} duplicate playlist names detected.</p>
                        <p>How would you like to proceed?</p>
                    </>
                ),
                options: {
                    replace: 'Replace existing playlists',
                    skip: 'Skip these files',
                    decide: 'Decide for each file',
                },
                suggestedValue: 'replace',
                system: true,
            });
            if (!decision) {
                // Cancelled.
                return;
            }
            // Process additions.
            results = await Promise.all(additions.map((file) => importPlaylist(file)));
            // Process duplicates.
            if (decision === 'skip') {
                results.push(...duplicates.map(() => 'skipped' as const));
            } else {
                for (const duplicate of duplicates) {
                    const result = await importPlaylist(duplicate, decision === 'replace');
                    results.push(result);
                }
            }
        }
        const countResult = (type: ResultType) =>
            results.filter((result) => result === type).length;
        const imported = countResult('success');
        const skipped = countResult('skipped');
        const errors = countResult('error');
        const invalid = invalidFiles.length;
        alert({
            icon: 'localdb',
            title: 'Import complete',
            message: (
                <ul
                    style={{
                        textAlign: 'left',
                        listStyle: 'disc',
                        margin: '0 1em',
                    }}
                >
                    <li>
                        {imported} {imported === 1 ? 'file' : 'files'} imported
                    </li>
                    <li>
                        {skipped} {skipped === 1 ? 'file' : 'files'} skipped
                    </li>
                    <li>
                        {errors} {errors === 1 ? 'error' : 'errors'}
                    </li>
                    {invalid > 0 ? (
                        <li>
                            {invalid} {invalid === 1 ? 'file' : 'files'} could not be processed
                        </li>
                    ) : null}
                </ul>
            ),
            system: true,
        });
    }
}

async function importPlaylist(file: ImportedFile, confirmed = false): Promise<ResultType> {
    try {
        const playlist = file.data!;
        let name = playlist.title;
        confirmed = confirmed || !playlists.getLocalPlaylistByName(name);
        while (name && !confirmed) {
            name = await prompt({
                icon: 'localdb',
                title: 'Import playlist',
                message: `The playlist '${file.fileName}' has the same name as an existing playlist.`,
                label: 'Rename',
                suggestedValue: name,
                okLabel: 'Import',
                system: true,
            });
            if (name) {
                confirmed = await confirmOverwritePlaylist(name);
            }
        }
        if (confirmed) {
            // Mutate the imported data (`title` might be accessed for messaging).
            (playlist as any).title = name;
            await playlists.importPlaylist(playlist);
            return 'success';
        } else {
            return 'skipped';
        }
    } catch (err) {
        logger.error(err);
        return 'error';
    }
}

async function parseFile(file: File): Promise<ImportedFile> {
    const fileName = file.name;
    try {
        const data = await file.text();
        const importedPlaylist: ExportedPlaylist = JSON.parse(data);
        if (playlists.validate(importedPlaylist)) {
            return {fileName, data: importedPlaylist};
        } else {
            return {fileName, data: null};
        }
    } catch {
        return {fileName, data: null};
    }
}
