import React from 'react';
import Theme from 'types/Theme';
import {groupBy, Logger, partition} from 'utils';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import {alert, error, prompt, select} from 'components/Dialog';
import confirmOverwriteTheme from './confirmOverwriteTheme';

const logger = new Logger('importThemesFromFile');

interface ImportedFile {
    fileName: string;
    data: Theme | null;
}

type ResultType = 'success' | 'error' | 'skipped';

export default async function importThemesFromFile(files: FileList): Promise<void> {
    const parsedFiles = await Promise.all([...files].map((file) => parseFile(file)));
    const [validFiles, invalidFiles] = partition(parsedFiles, (file) => !!file.data);
    if (files.length === 1) {
        if (invalidFiles.length === 1) {
            error('Not a valid theme.');
        } else {
            const theme = validFiles[0].data!;
            const result = await importTheme(validFiles[0]);
            if (result === 'success') {
                alert({
                    icon: 'palette',
                    title: 'Import complete',
                    message: `Theme '${theme.name}' imported.`,
                    system: true,
                });
            } else if (result === 'error') {
                error('Could not load theme.');
            }
        }
    } else {
        const additions: ImportedFile[] = [];
        const [duplicates, newFiles] = partition(
            validFiles,
            (file) => !!themeStore.getUserTheme(file.data!.name)
        );
        const newFilesGroupedByName = groupBy(newFiles, (file) => file.data!.name);
        Object.keys(newFilesGroupedByName).forEach((name) => {
            const group = newFilesGroupedByName[name];
            while (group.length > 1) {
                const file = group.pop()!;
                duplicates.push(file);
            }
            additions.push(group[0]);
        });
        let results: Awaited<ReturnType<typeof importTheme>>[] = [];
        if (duplicates.length < 2) {
            results = await Promise.all(validFiles.map((file) => importTheme(file)));
        } else {
            const decision = await select({
                icon: 'palette',
                title: 'Replace or skip themes',
                message: (
                    <>
                        <p>{duplicates.length} duplicate theme names detected.</p>
                        <p>How would you like to proceed?</p>
                    </>
                ),
                options: {
                    replace: 'Replace existing themes',
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
            results = await Promise.all(additions.map((file) => importTheme(file)));
            // Process duplicates.
            if (decision === 'skip') {
                results.push(...duplicates.map(() => 'skipped' as const));
            } else {
                for (const duplicate of duplicates) {
                    const result = await importTheme(duplicate, decision === 'replace');
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
            icon: 'palette',
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

async function importTheme(file: ImportedFile, confirmed = false): Promise<ResultType> {
    try {
        const theme = file.data!;
        let name = theme.name;
        confirmed = confirmed || !themeStore.getUserTheme(name);
        while (name && !confirmed) {
            name = await prompt({
                icon: 'palette',
                title: 'Import theme',
                message: `The theme '${file.fileName}' has the same name as an existing theme.`,
                label: 'Rename',
                suggestedValue: name,
                okLabel: 'Import',
                system: true,
            });
            if (name) {
                confirmed = await confirmOverwriteTheme(name);
            }
        }
        if (confirmed) {
            // Mutate the theme (`name` might be accessed for messaging).
            (theme as any).name = name;
            await themeStore.addUserTheme(theme);
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
        const importedTheme: Theme = JSON.parse(data);
        if (theme.validate(importedTheme)) {
            return {fileName, data: importedTheme};
        } else {
            return {fileName, data: null};
        }
    } catch {
        return {fileName, data: null};
    }
}
