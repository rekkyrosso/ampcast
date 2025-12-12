import PlaylistItem from 'types/PlaylistItem';
import {observeNextItem, getNextItem} from 'services/playlist';
import useObservable from 'hooks/useObservable';

export default function useNextPlaylistItem(): PlaylistItem | null {
    return useObservable(observeNextItem, getNextItem());
}
