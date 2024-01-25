import MediaItem from './MediaItem';
import MediaService from './MediaService';

export default interface ItemsByService<T extends MediaItem> {
    readonly service: MediaService;
    readonly items: readonly T[];
}
