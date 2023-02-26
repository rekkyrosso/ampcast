import {confirm} from 'components/Dialog';

export default async function confirmDeleteTheme(name: string): Promise<boolean> {
    return confirm({
        title: 'My themes',
        message: `Delete theme '${name}'?`,
        okLabel: 'Delete',
        storageId: 'delete-user-theme',
        system: true,
    });
}
