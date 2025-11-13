import {confirm} from 'components/Dialog';
import playlists from '../playlists';

export default async function confirmOverwritePlaylist(name: string): Promise<boolean> {
    if (!playlists.getLocalPlaylistByName(name)) {
        return true;
    }
    return confirm({
        icon: 'localdb',
        title: 'Playlists',
        message: `Overwrite existing playlist '${name}'?`,
        okLabel: 'Overwrite',
        system: true,
    });
}
