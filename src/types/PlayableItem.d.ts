import MediaItem from './MediaItem';

type PlayableItem = Pick<MediaItem, 'src' | 'srcs' | 'playbackType' | 'container' | 'startTime'> & {
    readonly duration?: number;
};

export default PlayableItem;
