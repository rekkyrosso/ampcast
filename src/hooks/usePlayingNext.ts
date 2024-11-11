import PlaylistItem from 'types/PlaylistItem';
import {getNextItem, observeNextItem} from 'services/playlist';
import useObservable from 'hooks/useObservable';

export default function usePlayingNext(): PlaylistItem | null {
    return useObservable(observeNextItem, getNextItem());
}
