import playbackSettings, {observePlaybackSettings} from 'services/mediaPlayback/playbackSettings';
import useObservable from './useObservable';

export default function usePlaybackSettings() {
    return useObservable(observePlaybackSettings, {...playbackSettings});
}
