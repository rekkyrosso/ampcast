import MediaItem from './MediaItem';

type PlayableItem = Pick<
    MediaItem,
    | 'src'
    | 'srcs'
    | 'fileName'
    | 'linearType'
    | 'playbackType'
    | 'isLivePlayback'
    | 'container'
    | 'startTime'
> & {
    readonly duration?: number; // Make this optional
};

export default PlayableItem;
