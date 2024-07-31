import miniPlayer from 'services/mediaPlayback/miniPlayer';
import useObservable from './useObservable';

export default function useMiniPlayerActive(): boolean {
    return useObservable(miniPlayer.observeActive, miniPlayer.active);
}
