import React from 'react';
import {Except} from 'type-fest';
import MediaObject from 'types/MediaObject';
import PagedItems, {PagedItemsProps} from 'components/MediaBrowser/PagedItems';
import useFirstValue from 'hooks/useFirstValue';

export default function RelatedItems<T extends MediaObject>({
    source,
    emptyMessage = 'Nothing found.',
    ...props
}: Except<PagedItemsProps<T>, 'pager'>) {
    const pager = useFirstValue(source.search());
    return <PagedItems {...props} source={source} pager={pager} emptyMessage={emptyMessage} />;
}
