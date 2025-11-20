import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import {refreshToken} from './youtubeAuth';
import youtubeApi from './youtubeApi';
import youtubeCache from './youtubeCache';
import {createMediaItem, createMediaPlaylist} from './youtubeUtils';

type YouTubeVideo = gapi.client.youtube.Video;
type YouTubePlaylist = gapi.client.youtube.Playlist;
type YouTubePlaylistItem = gapi.client.youtube.PlaylistItem;
type YouTubeSearchResult = gapi.client.youtube.SearchResult;
type YouTubeItem = YouTubeVideo | YouTubePlaylist | YouTubePlaylistItem | YouTubeSearchResult;

export interface YouTubeCacheable<T extends YouTubeItem = YouTubeItem> {
    readonly etag?: string;
    readonly kind?: string;
    readonly items?: readonly T[];
}

interface YouTubePage<T extends YouTubeItem = YouTubeItem> extends YouTubeCacheable<T> {
    readonly pageInfo?: gapi.client.youtube.PageInfo;
    readonly nextPageToken?: string | undefined;
}

export default class YouTubePager<T extends MediaObject> extends SequentialPager<T> {
    static minPageSize = 5;
    static maxPageSize = 50;
    static videoFields =
        'items(id,snippet(title,thumbnails,channelId,channelTitle),contentDetails(duration),statistics(viewCount,likeCount))';
    static playlistFields =
        'items(id,snippet(title,description,publishedAt,thumbnails,channelId,channelTitle),contentDetails(itemCount),status(privacyStatus))';

    private nextPageToken: string | undefined = undefined;
    private pageNumber = 1;

    constructor(path: string, params: Record<string, string>, options?: Partial<PagerConfig<T>>) {
        super(async (): Promise<Page<T>> => this.fetchPage(path, params), {
            pageSize: YouTubePager.maxPageSize,
            ...options,
        });
    }

    private async fetchPage(path: string, params: Record<string, string>): Promise<Page<T>> {
        const cacheKey = this.createCacheKey(path, params, this.pageNumber);
        const cachedResult = await this.getFromCache<YouTubeCacheable<YouTubePage>>(cacheKey);
        const pageToken = this.nextPageToken || '';
        const result = await this.fetch<YouTubePage>(
            path,
            {
                ...params,
                fields: `etag,kind,pageInfo,nextPageToken,${params.fields || 'items'}`,
                maxResults: String(this.config.pageSize),
                pageToken,
            },
            cachedResult
        );
        const {pageInfo, nextPageToken, ...page} = result;
        const items = await this.createItems(page, cacheKey);
        const total = pageInfo?.totalResults;
        const atEnd = !nextPageToken;
        this.nextPageToken = nextPageToken;
        this.pageNumber++;
        await this.saveToCache(cacheKey, result);
        return {items, total, atEnd};
    }

    private async createItems({kind, items = []}: YouTubePage, cacheKey: string): Promise<T[]> {
        switch (kind) {
            case 'youtube#playlistListResponse':
                return items.map(
                    (item) => createMediaPlaylist(item as YouTubePlaylist) as unknown as T
                );

            case 'youtube#playlistItemListResponse': {
                const videoIds = items.map(
                    (item) => (item as YouTubePlaylistItem).contentDetails!.videoId!
                );
                const videos = await this.fetchVideos(videoIds, cacheKey);
                return videos.map((video) => createMediaItem(video) as unknown as T);
            }

            case 'youtube#searchListResponse': {
                const videoIds = items.map((item) => (item as YouTubeSearchResult).id!.videoId!);
                const videos = await this.fetchVideos(videoIds, cacheKey);
                return videos.map((video) => createMediaItem(video) as unknown as T);
            }

            default:
                return items.map((item) => createMediaItem(item as YouTubeVideo) as unknown as T);
        }
    }

    private async fetchVideos(
        videoIds: string[],
        cacheKey: string
    ): Promise<readonly YouTubeVideo[]> {
        const videosCacheKey = `${cacheKey}/videos`;
        const cachedResult = await this.getFromCache<YouTubeCacheable<YouTubeVideo>>(
            videosCacheKey
        );
        const result = await this.fetch<YouTubeCacheable<YouTubeVideo>>(
            '/videos',
            {
                id: videoIds.join(','),
                part: 'contentDetails,snippet,statistics',
                fields: `etag,${YouTubePager.videoFields}`,
            },
            cachedResult
        );
        await this.saveToCache(videosCacheKey, result);
        return result.items || [];
    }

    private async fetch<T extends YouTubeCacheable>(
        path: string,
        params: Record<string, unknown>,
        cachedResult?: T | undefined
    ): Promise<T> {
        const etag = cachedResult?.etag;
        const headers = etag ? {'If-None-Match': etag} : undefined;
        try {
            return await youtubeApi.get({path, params, headers});
        } catch (err: any) {
            if (err.status === 401) {
                await refreshToken(); // this throws
                // We'll never get here.
                return youtubeApi.get({path, params, headers});
            } else if (err.status === 304 && etag) {
                return cachedResult;
            } else {
                throw err;
            }
        }
    }

    private async getFromCache<T extends YouTubeCacheable>(key: string): Promise<T | undefined> {
        return youtubeCache.fetch(key) as unknown as T;
    }

    private async saveToCache<T extends YouTubeCacheable>(key: string, result: T): Promise<void> {
        if (!this.config.noCache) {
            await youtubeCache.store(key, result);
        }
    }

    private createCacheKey(
        path: string,
        params: Record<string, string>,
        pageNumber: number
    ): string {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {fields, ...search} = params;
        return `${path}?${new URLSearchParams(search)}#${pageNumber}`;
    }
}
