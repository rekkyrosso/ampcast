import MediaItem from './MediaItem';

type ScrobbleData = Pick<MediaItem, 'linearType' | 'scrobbleAs' | 'scrobbleOverride'>;

export default ScrobbleData;
