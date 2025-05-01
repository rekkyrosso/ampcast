import playback, {observeCurrentTime} from 'services/mediaPlayback/playback';
import useObservable from './useObservable';

export default function useCurrentTime(): number {
    return useObservable(observeCurrentTime, playback.currentTime);
}
