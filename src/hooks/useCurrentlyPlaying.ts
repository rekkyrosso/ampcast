import PlaylistItem from 'types/PlaylistItem';
import {getCurrentItem, observeCurrentItem} from 'services/playlist';
import useObservable from './useObservable';

export default function useCurrentlyPlaying(): PlaylistItem | null {
    return useObservable(observeCurrentItem, getCurrentItem());
}
