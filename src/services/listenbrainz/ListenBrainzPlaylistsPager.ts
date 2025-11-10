import ItemType from 'types/ItemType';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page} from 'types/Pager';
import {getTextFromHtml} from 'utils';
import SequentialPager from 'services/pagers/SequentialPager';
import pinStore from 'services/pins/pinStore';
import listenbrainzApi from './listenbrainzApi';
import ListenBrainzPlaylistItemsPager from './ListenBrainzPlaylistItemsPager';
import listenbrainzSettings from './listenbrainzSettings';

export default class ListenBrainzPlaylistsPager extends SequentialPager<MediaPlaylist> {
    constructor(path: string, singleItem?: boolean) {
        let offset = 0;

        super(
            async (count: number): Promise<Page<MediaPlaylist>> => {
                if (singleItem) {
                    const {playlist} =
                        await listenbrainzApi.get<ListenBrainz.PlaylistItemsResponse>(
                            path,
                            {fetch_metadata: false},
                            true
                        );
                    const item = this.createItem(playlist);
                    return {items: [item], total: 1, atEnd: true};
                } else {
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
                }
            },
            {pageSize: 50}
        );
    }

    private createItems(items: readonly {playlist: ListenBrainz.Playlist}[]): MediaPlaylist[] {
        return items.map(({playlist}) => this.createItem(playlist));
    }

    private createItem(playlist: ListenBrainz.Playlist): MediaPlaylist {
        const playlist_mbid = playlist.identifier.split('/').pop()!;
        const src = `listenbrainz:playlist:${playlist_mbid}`;
        const owned = playlist.creator === listenbrainzSettings.userId;
        const extension = playlist.extension?.['https://musicbrainz.org/doc/jspf#playlist'];
        return {
            itemType: ItemType.Playlist,
            src,
            title: playlist.title,
            description: this.getTextFromHtml(playlist.annotation),
            externalUrl: playlist.identifier,
            owned,
            owner: {
                name: playlist.creator,
            },
            isPinned: pinStore.isPinned(src),
            pager: new ListenBrainzPlaylistItemsPager(playlist_mbid),
            trackCount: undefined,
            public: extension?.public,
            editable: owned,
            modifiedAt: this.parseDate(extension?.last_modified_at),
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

    private parseDate(date = ''): number {
        const time = Date.parse(date) || 0;
        return time < 0 ? 0 : Math.round(time / 1000);
    }
}
