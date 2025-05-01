import playback, {observeDuration} from 'services/mediaPlayback/playback';
import useObservable from './useObservable';

export default function useDuration(): number {
    return useObservable(observeDuration, playback.duration);
}
