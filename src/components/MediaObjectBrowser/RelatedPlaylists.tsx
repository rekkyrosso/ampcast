import React from 'react';
import {Except} from 'type-fest';
import MediaPlaylist from 'types/MediaPlaylist';
import {PagedItemsProps} from 'components/MediaBrowser/PagedItems';
import Playlists from 'components/MediaBrowser/Playlists';
import useFirstValue from 'hooks/useFirstValue';

export default function RelatedPlaylists({
    source,
    ...props
}: Except<PagedItemsProps<MediaPlaylist>, 'pager'>) {
    const pager = useFirstValue(source.search());
    return <Playlists {...props} source={source} pager={pager} />;
}
