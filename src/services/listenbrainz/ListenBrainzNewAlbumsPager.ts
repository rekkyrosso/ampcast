import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import {musicBrainzHost} from 'services/musicbrainz';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import MusicBrainzAlbumTracksPager from 'services/musicbrainz/MusicBrainzAlbumTracksPager';
import ErrorPager from 'services/pagers/ErrorPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

export default class ListenBrainzNewAlbumsPager extends SimpleMediaPager<MediaAlbum> {
    constructor() {
        super(async () => {
            const {
                payload: {releases = []},
            } = await listenbrainzApi.get<ListenBrainz.User.FreshReleases>(
                `user/${listenbrainzSettings.userId}/fresh_releases`,
                {future: false}
            );
            return (releases as ListenBrainz.User.FreshRelease[])
                .reverse()
                .map((release) => this.createMediaAlbum(release));
        });
    }

    private createMediaAlbum(album: ListenBrainz.User.FreshRelease): MediaAlbum {
        const mbid = album.release_mbid || undefined;
        const releaseDate = new Date(album.release_date);
        return {
            itemType: ItemType.Album,
            albumType: musicbrainzApi.getAlbumType(
                album.release_group_primary_type,
                album.release_group_secondary_type
            ),
            src: `listenbrainz:album:${nanoid()}`,
            externalUrl: mbid ? `${musicBrainzHost}/release/${mbid}` : undefined,
            title: album.release_name,
            artist: album.artist_credit_name,
            release_mbid: mbid,
            artist_mbids: album.artist_mbids,
            caa_mbid: album?.caa_release_mbid,
            playCount: album.listen_count,
            trackCount: undefined,
            year: releaseDate.getFullYear() || undefined,
            releasedAt: Math.round(releaseDate.getTime() / 1000) || undefined,
            pager: mbid
                ? new MusicBrainzAlbumTracksPager(mbid)
                : new ErrorPager(Error('No MusicBrainz id')),
        };
    }
}
