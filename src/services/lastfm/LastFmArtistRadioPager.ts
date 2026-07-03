import {nanoid} from 'nanoid';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import PlaylistItem from 'types/PlaylistItem';
import {Logger, partition, shuffle, sleep} from 'utils';
import lookup from 'services/lookup';
import {getService} from 'services/mediaServices';
import {findBestMatch, fuzzyCompareTrackTitles} from 'services/metadata';
import MediaPager from 'services/pagers/MediaPager';
import lastfmApi from './lastfmApi';
import {createMediaItem} from './lastfmUtils';

const logger = new Logger('LastFmArtistRadioPager');

type ArtistInfo = Pick<LastFm.Artist, 'name' | 'mbid'>;

export default class LastFmArtistRadioPager extends MediaPager<MediaItem> {
    private readonly artist: ArtistInfo;
    private artistTracks: PlaylistItem[] = [];
    private artistsQueue: ArtistInfo[] = [];
    private tracksQueue: PlaylistItem[] = [];
    private loaded = false;
    private lastLookupTime = 0;

    constructor(
        item: MediaItem,
        private readonly serviceId?: MediaServiceId
    ) {
        super({pageSize: 5});
        this.artist = {
            name: item.artists?.[0] || '',
            mbid: item.artist_mbids?.[0],
        };
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

    private createItems(artist: string, tracks: readonly LastFm.Track[]): readonly PlaylistItem[] {
        const uniqueItems: PlaylistItem[] = [];
        tracks = tracks.filter((track) => Number(track.playcount) > 5);
        let [firstItem, ...nextItems] = tracks.map((track) => ({
            ...createMediaItem(track, 'userplaycount'),
            id: nanoid(),
        }));
        // Filter out duplicates.
        while (firstItem) {
            uniqueItems.push(firstItem);
            [, nextItems] = partition(nextItems, (nextItem) =>
                fuzzyCompareTrackTitles(artist, nextItem.title, firstItem.title)
            );
            [firstItem, ...nextItems] = nextItems;
        }
        return uniqueItems;
    }

    private async fetch(): Promise<void> {
        this.loaded = true;
        this.busy = true;
        try {
            this.error = undefined;
            if (!this.artist.name) {
                throw Error('No radio source');
            }
            const {name, mbid} = this.artist;
            const [tracks, similarArtists] = await Promise.all([
                lastfmApi.getArtistTopTracks(name, mbid, 200),
                lastfmApi.getSimilarArtists(name, mbid, 20),
            ]);
            this.artistTracks = shuffle(this.createItems(name, tracks));
            this.artistsQueue = shuffle(
                similarArtists.concat(Array(Math.ceil(tracks.length / 40)).fill(this.artist))
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
                if (!nextItem && this.artistsQueue.length > 0) {
                    return this.fetchNext();
                }
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

    private async fetchTracks(artist: ArtistInfo): Promise<readonly PlaylistItem[]> {
        try {
            if (artist === this.artist) {
                return this.artistTracks.splice(0, 40);
            } else {
                const tracks = await lastfmApi.getArtistTopTracks(artist.name, artist.mbid, 40);
                return this.createItems(artist.name, tracks);
            }
        } catch (err) {
            logger.error(err);
            return [];
        }
    }

    private async lookup(track: PlaylistItem): Promise<MediaItem | undefined> {
        const timeSinceLastCall = Date.now() - this.lastLookupTime;
        if (timeSinceLastCall < 1000) {
            await sleep(1000 - timeSinceLastCall);
        }
        this.lastLookupTime = Date.now();
        if (this.serviceId) {
            if (this.service?.lookup) {
                const {title, artists: [artist = ''] = []} = track;
                const foundItems = await this.service.lookup(artist, title);
                return findBestMatch(foundItems, track);
            } else {
                throw Error('Lookup service not found');
            }
        } else {
            return lookup(track);
        }
    }
}
