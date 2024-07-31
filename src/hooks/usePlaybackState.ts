import PlaybackState from 'types/PlaybackState';
import {getPlaybackState, observePlaybackState} from 'services/mediaPlayback/playback';
import useObservable from './useObservable';

export default function usePlaybackState(): PlaybackState {
    return useObservable(observePlaybackState, getPlaybackState());
}
