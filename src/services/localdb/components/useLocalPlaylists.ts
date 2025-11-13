import {useMemo} from 'react';
import useObservable from 'hooks/useObservable';
import playlists from '../playlists';

export default function useLocalPlaylists() {
    const observeLocalPlaylists = useMemo(() => () => playlists.observeLocalPlaylists(), []);
    return useObservable(observeLocalPlaylists, playlists.getLocalPlaylists());
}
