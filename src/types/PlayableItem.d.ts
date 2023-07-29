import MediaItem from './MediaItem';

type PlayableItem = Pick<MediaItem, 'src' | 'srcs'>;

export default PlayableItem;
