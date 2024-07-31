import PlaybackState from 'types/PlaybackState';
import {isMiniPlayer} from 'utils';

const defaultPlaybackState: PlaybackState = {
    currentItem: null,
    currentTime: 0,
    startedAt: 0,
    endedAt: 0,
    duration: 0,
    paused: true,
    playbackId: '',
    miniPlayer: isMiniPlayer,
};

export default defaultPlaybackState;
