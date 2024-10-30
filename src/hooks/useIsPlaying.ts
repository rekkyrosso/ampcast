import usePlaybackState from './usePlaybackState';

export default function useIsPlaying(): boolean {
    const {paused, currentTime} = usePlaybackState();
    return !paused && currentTime > 0;
}
