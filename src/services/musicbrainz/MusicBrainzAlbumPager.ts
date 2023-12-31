import MediaItem from 'types/MediaItem';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import musicbrainzApi, {createMediaItem} from './musicbrainzApi';

export default class MusicBrainzAlbumPager extends SimpleMediaPager<MediaItem> {
    constructor(release_mbid: string) {
        super(async (): Promise<readonly MediaItem[]> => {
            const release = await musicbrainzApi.get<MusicBrainz.Release>(
                `release/${release_mbid}`,
                {inc: 'recordings+artist-credits+isrcs'}
            );
            const {media: [{tracks = []} = {}] = []} = release;
            return tracks.map((track) => createMediaItem(release, track));
        });
    }
}
