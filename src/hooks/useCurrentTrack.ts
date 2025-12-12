import PlaylistItem from 'types/PlaylistItem';
import playback, {observeCurrentItem} from 'services/mediaPlayback/playback';
import useObservable from './useObservable';

export default function useCurrentTrack(): PlaylistItem | null {
    return useObservable(observeCurrentItem, playback.currentItem);
}
