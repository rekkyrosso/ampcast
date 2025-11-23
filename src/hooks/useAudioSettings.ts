import {audioSettings, observeAudioSettings} from 'services/audio';
import useObservable from './useObservable';

export default function useAudioSettings() {
    return useObservable(observeAudioSettings, {...audioSettings});
}
