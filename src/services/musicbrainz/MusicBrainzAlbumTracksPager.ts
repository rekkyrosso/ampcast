import MediaItem from 'types/MediaItem';
import {uniq} from 'utils';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import youtubeApi from 'services/youtube/youtubeApi';
import musicbrainzApi, {createMediaItem} from './musicbrainzApi';

export default class MusicBrainzAlbumTracksPager extends SimpleMediaPager<MediaItem> {
    constructor(release_mbid: string) {
        super(async (): Promise<readonly MediaItem[]> => {
            const release = await musicbrainzApi.get<MusicBrainz.Release>(
                `release/${release_mbid}`,
                {inc: 'recordings+artist-credits+isrcs+url-rels'}
            );
            const {media: [{tracks = []} = {}] = []} = release;
            const items = tracks.map((track) => createMediaItem(release, track));
            if (items.length === 1) {
                const urls = this.getUrls(release);
                return items.map((item) => {
                    const youtubeUrl = urls?.find((url) => /youtu\.?be/.test(url));
                    if (youtubeUrl) {
                        const src = youtubeApi.getVideoSrc(youtubeUrl);
                        return {...item, link: {src, externalUrl: youtubeUrl}};
                    }
                    return item;
                });
            }
            return items;
        });
    }

    private getUrls(entity: MusicBrainz.Release): readonly string[] | undefined {
        const urls = entity['relations']
            ?.filter((relation) => relation['target-type'] === 'url')
            .map((relation) => relation.url.resource)
            .filter((url) => !url.includes('google.com'));
        return urls?.length ? uniq(urls) : undefined;
    }
}
