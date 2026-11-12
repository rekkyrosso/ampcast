import React from 'react';
import Bookmark from 'types/Bookmark';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import {getElapsedTimeText} from 'utils';
import CoverArt from 'components/CoverArt';
import {ListViewLayout} from 'components/ListView';
import {IconTitle} from 'components/MediaList/mediaListFields';

const bookmarksLayout: ListViewLayout<Bookmark> = {
    view: 'card small',
    cols: [
        {
            title: 'Thumbnail',
            render: (item) => <CoverArt item={item as MediaObject} />,
            className: 'thumbnail',
        },
        {
            title: 'Title',
            render: IconTitle as any,
            className: 'title h1',
        },
        {
            title: 'Bookmarked',
            render: (item) => {
                return (
                    <time className="text" title={new Date(item.bookmarkedAt).toLocaleString()}>
                        {getElapsedTimeText(item.bookmarkedAt)}
                    </time>
                );
            },
            align: 'right',
            className: 'bookmarked-at date data',
        },
        {
            title: 'Description',
            render: (item) => {
                return <span className="text">{getDescription(item)}</span>;
            },
            className: 'h2',
        },
    ],
};

export default bookmarksLayout;

function getDescription(bookmark: Bookmark): string {
    switch (bookmark.itemType) {
        case ItemType.Playlist:
            return 'Playlist';

        case ItemType.Artist:
            return 'Artist';

        case ItemType.Album:
            return bookmark.artists?.length ? `Album by ${bookmark.artists}` : 'Album';

        case ItemType.Media: {
            const type = bookmark.mediaType === MediaType.Video ? 'Video' : 'Track';
            return bookmark.artists?.length ? `${type} by ${bookmark.artists}` : type;
        }
    }
}
