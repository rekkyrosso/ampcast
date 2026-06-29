import MediaItem from 'types/MediaItem';
import {getMediaObjectId} from 'utils';
import MediaPager from 'services/pagers/MediaPager';
import plexApi from './plexApi';
import plexSettings from './plexSettings';
import {createMediaItemFromTrack, getMediaAlbums, getMetadata} from './plexUtils';

export default class PlexRadioPager extends MediaPager<MediaItem> {
    private playQueueID = 0;

    constructor(private readonly src: string) {
        super({pageSize: 5});
    }

    fetchAt(position: number): void {
        if (!this.busy && (position % 2 === 0 || position === this.items.length - 1)) {
            this.refreshQueue();
        }
    }

    private async createItems(
        queueItems: readonly plex.PlayQueueItem[]
    ): Promise<readonly MediaItem[]> {
        const [tracks, albums] = await Promise.all([
            getMetadata(queueItems),
            getMediaAlbums(queueItems),
        ]);
        return tracks.map((track, index) => {
            const album = albums.find((album) => album.src.endsWith(`:${track.parentRatingKey}`));
            const item = createMediaItemFromTrack(track, album);
            return {
                ...item,
                plex: {...item.plex, playQueueItemID: queueItems[index].playQueueItemID},
            };
        });
    }

    private async refreshQueue(): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            const existingKeys = this.items.map(getMediaObjectId);
            const playQueue = await (this.playQueueID
                ? plexApi.getPlayQueue(this.playQueueID)
                : plexApi.createPlayQueue(
                      {src: this.src},
                      {maxDegreesOfSeparation: plexSettings.radioDegreesOfSeparation}
                  ));
            const items = await this.createItems(
                playQueue.Metadata.filter(
                    (queueItem) => !existingKeys.includes(queueItem.ratingKey)
                )
            );
            this.playQueueID = playQueue.playQueueID;
            this.items = this.items.concat(items);
        } catch (err) {
            this.error = err;
        }
        this.busy = false;
    }
}
