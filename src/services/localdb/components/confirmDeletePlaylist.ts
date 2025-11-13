import {confirm} from 'components/Dialog';

export default async function confirmDeletePlaylist(name: string): Promise<boolean> {
    return confirm({
        icon: 'localdb',
        title: 'Playlists',
        message: `Delete playlist '${name}'?`,
        okLabel: 'Delete',
        storageId: 'delete-local-playlist',
        system: true,
    });
}
