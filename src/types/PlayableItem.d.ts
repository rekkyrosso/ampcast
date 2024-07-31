import MediaItem from './MediaItem';

type PlayableItem = Pick<MediaItem, 'src' | 'srcs' | 'playbackType' | 'startTime'>;

export default PlayableItem;
