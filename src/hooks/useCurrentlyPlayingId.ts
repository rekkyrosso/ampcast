import useCurrentlyPlaying from './useCurrentlyPlaying';

export default function useCurrentlyPlayingId(): string {
    const item = useCurrentlyPlaying();
    return item?.id || '';
}
