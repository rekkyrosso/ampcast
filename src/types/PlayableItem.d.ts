import MediaItem from './MediaItem';

type PlayableItem = Pick<MediaItem, 'src' | 'srcs' | 'playbackType' | 'container' | 'startTime'>;

export default PlayableItem;
