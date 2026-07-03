import {nanoid} from 'nanoid';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import PlaylistItem from 'types/PlaylistItem';
import {Logger, shuffle} from 'utils';
import lookup from 'services/lookup';
import {getService} from 'services/mediaServices';
import {findBestMatch} from 'services/metadata';
import MediaPager from 'services/pagers/MediaPager';
import lastfmApi from './lastfmApi';
import {createMediaItem} from './lastfmUtils';

const logger = new Logger('LastFmArtistRadioPager');

export default class LastFmArtistRadioPager extends MediaPager<MediaItem> {
    private readonly artist: string;
    private artistTracks: LastFm.Track[] = [];
    private artistsQueue: string[] = [];
    private tracksQueue: LastFm.Track[] = [];
    private loaded = false;

    constructor(
        item: MediaItem,
        private readonly serviceId?: MediaServiceId
    ) {
        super({pageSize: 5});
        this.artist = item.artists?.[0] || '';
    }

    fetchAt(): void {
        if (!this.busy) {
            if (this.loaded) {
                this.fetchNext();
            } else {
                this.fetch();
            }
        }
    }

    private get service(): MediaService | undefined {
        return getService(this.serviceId || '');
    }

    private createLookupItem(track: LastFm.Track): PlaylistItem {
        return {...createMediaItem(track), id: nanoid()};
    }

    private async fetch(): Promise<void> {
        this.loaded = true;
        this.busy = true;
        try {
            this.error = undefined;
            if (!this.artist) {
                throw Error('No radio source');
            }
            const [tracks, similarArtists] = await Promise.all([
                lastfmApi.getArtistTopTracks(this.artist, 200),
                lastfmApi.getSimilarArtists(this.artist, 20),
            ]);
            this.artistTracks = shuffle(tracks);
            this.artistsQueue = shuffle(
                similarArtists
                    .map((artist) => artist.name)
                    .concat(Array(Math.ceil(tracks.length / 40)).fill(this.artist))
            );

            await this.fetchNext();
            await this.fetchNext();

            if (this.items.length === 0) {
                throw Error('No tracks found');
            }
        } catch (err) {
            this.error = err;
        }
        this.busy = false;
    }

    private async fetchNext(): Promise<void> {
        this.busy = true;
        try {
            let nextItem: MediaItem | undefined;
            const artist = this.artistsQueue.shift();
            if (artist) {
                const [nextTrack, ...tracks] = await this.fetchTracks(artist);
                this.tracksQueue = shuffle(this.tracksQueue.concat(tracks));
                nextItem = await this.lookup(nextTrack);
            }
            while (!nextItem && this.tracksQueue.length) {
                const nextTrack = this.tracksQueue.shift()!;
                nextItem = await this.lookup(nextTrack);
            }
            if (nextItem) {
                this.items = this.items.concat(nextItem);
            }
        } catch (err) {
            logger.error(err);
        }
        this.busy = false;
    }

    private async fetchTracks(artist: string): Promise<readonly LastFm.Track[]> {
        try {
            if (artist === this.artist) {
                return this.artistTracks.splice(0, 40);
            } else {
                const tracks = await lastfmApi.getArtistTopTracks(artist, 40);
                return tracks;
            }
        } catch (err) {
            logger.error(err);
            return [];
        }
    }

    private async lookup(track: LastFm.Track): Promise<MediaItem | undefined> {
        const lookupItem = this.createLookupItem(track);
        if (this.serviceId) {
            if (this.service?.lookup) {
                const {title, artists: [artist = ''] = []} = lookupItem;
                const foundItems = await this.service.lookup(artist, title);
                return findBestMatch(foundItems, lookupItem);
            } else {
                throw Error('Lookup service not found');
            }
        } else {
            return lookup(lookupItem);
        }
    }
}
