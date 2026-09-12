import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import {chunk, compareArrays} from 'utils';
import mediaSources from 'services/mediaServices/mediaSources';
import {sorter} from 'services/metadata';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import type SubsonicService from './SubsonicService';
import type SubsonicApi from './SubsonicApi';
import type SubsonicUtils from './SubsonicUtils';

export default class SubsonicArtistAlbumsPager extends SimpleMediaPager<MediaAlbum> {
    constructor(
        private readonly service: SubsonicService,
        artist: Subsonic.Artist
    ) {
        super(async () => {
            const topTracks = this.createTopTracks(artist);
            const radios = this.createRadios(artist);
            this.items = [topTracks];
            let albums: Subsonic.Album[] | undefined = artist.album;
            if (!albums) {
                albums = await this.api.getArtistAlbums(artist.id);
            }
            const artistAlbums = albums.filter((album) => album.artistId === artist.id);
            const mediaAlbums = sorter.sort(
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
                    if (artist.id === song.artistId || artist.id === album?.artistId) {
                        const item = this.utils.createMediaItemFromSong(song);
                        allTracks.push(item);
                        if (artist.id !== album?.artistId) {
                            otherTracks.push(item);
                        }
                    }
                }
                // Keep refreshing the stream after each fetch.
                let items = [topTracks, radios, ...mediaAlbums];
                if (otherTracks.length > 0 && !compareArrays(otherTracks, allTracks)) {
                    items = items.concat(this.createOtherTracks(artist, otherTracks));
                }
                if (allTracks.length > 0) {
                    items = items.concat(this.createAllTracks(artist, allTracks));
                }
                this.items = items;
            }
            return this.items;
        });
    }

    private get api(): SubsonicApi {
        return this.service.api;
    }

    private get serviceId(): string {
        return this.service.id;
    }

    private get utils(): SubsonicUtils {
        return this.service.utils;
    }

    private createAllTracks(artist: Subsonic.Artist, items: readonly MediaItem[]): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:all-tracks:${artist.id}`,
            title: 'All Songs',
            artists: [artist.name],
            thumbnails: this.utils.createThumbnails(artist.coverArt),
            pager: new SimpleMediaPager(async () => sorter.sort(items, 'Year')),
            trackCount: undefined,
            synthetic: true,
            links: {
                artists: [this.utils.getArtistLink(artist)],
            },
        };
    }

    private createOtherTracks(artist: Subsonic.Artist, items: readonly MediaItem[]): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:other-tracks:${artist.id}`,
            title: 'Other Songs',
            artists: [artist.name],
            thumbnails: this.utils.createThumbnails(artist.coverArt),
            pager: new SimpleMediaPager(async () => sorter.sort(items, 'Year')),
            trackCount: undefined,
            synthetic: true,
            links: {
                artists: [this.utils.getArtistLink(artist)],
            },
        };
    }

    private createRadios(artist: Subsonic.Artist): MediaAlbum {
        const src = `${this.serviceId}:artist-radio:${artist.id}`;
        const thumbnails = this.utils.createThumbnails(artist.coverArt);
        const radio = mediaSources.createRadioItem({
            src,
            title: `${artist.name} - Radio`,
            thumbnails,
        });
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:radios:${artist.id}`,
            title: 'Radios',
            artists: [artist.name],
            thumbnails,
            pager: new SimplePager([radio]),
            trackCount: undefined,
            synthetic: true,
            links: {
                artists: [this.utils.getArtistLink(artist)],
            },
        };
    }

    private createTopTracks(artist: Subsonic.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:top-tracks:${artist.id}`,
            title: 'Top Songs',
            artists: [artist.name],
            thumbnails: this.utils.createThumbnails(artist.coverArt),
            pager: this.service.createTopTracksPager(artist.name),
            trackCount: undefined,
            synthetic: true,
            links: {
                artists: [this.utils.getArtistLink(artist)],
            },
        };
    }
}
