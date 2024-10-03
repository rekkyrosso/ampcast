import type {Observable} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaPlaylist from 'types/MediaPlaylist';
import Pager, {Page} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import {getTextFromHtml} from 'utils';
import listenbrainzApi from './listenbrainzApi';
import ListenBrainzPlaylistItemsPager from './ListenBrainzPlaylistItemsPager';

export default class ListenBrainzPlaylistsPager implements Pager<MediaPlaylist> {
    private readonly pager: SequentialPager<MediaPlaylist>;

    constructor(path: string) {
        const pageSize = 50;
        let offset = 0;

        this.pager = new SequentialPager<MediaPlaylist>(
            async (count = pageSize): Promise<Page<MediaPlaylist>> => {
                const response = await listenbrainzApi.get<ListenBrainz.User.PlaylistsResponse>(
                    path,
                    {offset, count},
                    true
                );
                offset += count;
                const items = this.createItems(response.playlists);
                const total = response.playlist_count;
                const atEnd = response.offset + items.length >= total;
                return {items, total, atEnd};
            },
            {pageSize}
        );
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeBusy(): Observable<boolean> {
        return this.pager.observeBusy();
    }

    observeItems(): Observable<readonly MediaPlaylist[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
    }

    fetchAt(index: number, length: number): void {
        this.pager.fetchAt(index, length);
    }

    private createItems(items: readonly {playlist: ListenBrainz.Playlist}[]): MediaPlaylist[] {
        return items.map(({playlist}) => this.createItem(playlist));
    }

    private createItem(playlist: ListenBrainz.Playlist): MediaPlaylist {
        const playlist_mbid = playlist.identifier.split('/').pop()!;
        return {
            itemType: ItemType.Playlist,
            src: `listenbrainz:playlist:${playlist_mbid}`,
            title: playlist.title,
            description: this.getTextFromHtml(playlist.annotation),
            externalUrl: playlist.identifier,
            owner: {
                name: playlist.creator,
            },
            pager: new ListenBrainzPlaylistItemsPager(playlist_mbid),
        };
    }

    private getTextFromHtml(html: string): string {
        if (/<\/?p>/i.test(html)) {
            const dummyElement = document.createElement('div');
            dummyElement.innerHTML = html || '';
            const paragraphs = Array.from(dummyElement.querySelectorAll('p')).map(
                (p) => p.textContent?.replace(/\s+/g, ' ') || ''
            );
            return paragraphs.join('\n');
        } else {
            return getTextFromHtml(html);
        }
    }
}
