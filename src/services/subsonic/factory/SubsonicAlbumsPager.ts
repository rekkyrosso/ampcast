import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import {chunk, compareArrays} from 'utils';
import {sorter} from 'services/metadata';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import type SubsonicService from './SubsonicService';
import type SubsonicApi from './SubsonicApi';
import type SubsonicUtils from './SubsonicUtils';

export default class SubsonicAlbumsPager extends SimpleMediaPager<MediaAlbum> {
    constructor(
        private readonly service: SubsonicService,
        artist: Subsonic.Artist
    ) {
        super(async () => {
            let albums: Subsonic.Album[] | undefined = artist.album;
            if (!albums) {
                albums = await this.api.getArtistAlbums(artist.id);
            }
            const artistAlbums = albums.filter((album) => album.artistId === artist.id);
            this.items = sorter.sort(
                artistAlbums.map((album) => this.utils.createMediaAlbum(album)),
                'Year'
            );
            const allTracks: MediaItem[] = [];
            const otherTracks: MediaItem[] = [];
            const chunks = chunk(albums, 5);
            for (const albums of chunks) {
                const songs = await Promise.all(
                    albums.map((album) => this.api.getAlbumTracks(album.id, album.isDir))
                );
                for (const song of songs.flat()) {
                    const album = albums.find((album) => song.albumId === album.id);
                    if (song.artistId === artist.id || artist.id === album?.artistId) {
                        const item = this.utils.createMediaItemFromSong(song);
                        allTracks.push(item);
                        if (artist.id !== album?.artistId) {
                            otherTracks.push(item);
                        }
                    }
                }
            }
            if (otherTracks.length > 0 && !compareArrays(otherTracks, allTracks)) {
                this.items = this.items.concat(this.createOtherTracks(artist, otherTracks));
            }
            if (allTracks.length > 0) {
                this.items = this.items.concat(this.createAllTracks(artist, allTracks));
            }
            return this.items;
        });
    }

    private get api(): SubsonicApi {
        return this.service.api;
    }

    private get utils(): SubsonicUtils {
        return this.service.utils;
    }

    private createAllTracks(artist: Subsonic.Artist, items: readonly MediaItem[]): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.service.id}:all-tracks:${artist.id}`,
            title: 'All Songs',
            artist: artist.name,
            thumbnails: this.utils.createThumbnails(artist.coverArt),
            pager: new SimpleMediaPager(async () => sorter.sort(items, 'Year')),
            trackCount: undefined,
            synthetic: true,
        };
    }

    private createOtherTracks(artist: Subsonic.Artist, items: readonly MediaItem[]): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.service.id}:other-tracks:${artist.id}`,
            title: 'Other Songs',
            artist: artist.name,
            thumbnails: this.utils.createThumbnails(artist.coverArt),
            pager: new SimpleMediaPager(async () => sorter.sort(items, 'Year')),
            trackCount: undefined,
            synthetic: true,
        };
    }
}
