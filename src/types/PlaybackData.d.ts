import {SetRequired} from 'type-fest';
import MediaItem from './MediaItem';

type PlaybackData = SetRequired<
    Pick<MediaItem, 'playbackType' | 'playbackExpiresAt' | 'srcs' | 'proxy'>,
    'playbackType'
>;

export default PlaybackData;
