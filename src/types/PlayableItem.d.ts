import MediaItem from './MediaItem';

type PlayableItem = Pick<MediaItem, 'src' | 'srcs' | 'playbackType'>;

export default PlayableItem;
