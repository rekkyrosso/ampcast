import {useCallback, useEffect, useState} from 'react';
import ItemType from 'types/ItemType';
import {Field} from 'types/MediaListLayout';
import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import {MediaSourceItems} from 'types/MediaSource';
import ParentOf from 'types/ParentOf';
import SortParams from 'types/SortParams';
import {setSourceSorting} from 'services/mediaServices/servicesSettings';
import {sorter} from 'services/metadata';
import useSorting from 'hooks/useSorting';
import {getField} from './mediaListFields';

const defaultAlbumSort: SortParams = {
    sortBy: 'Track',
    sortOrder: 1,
};

export default function useMediaListSort<T extends MediaObject>(
    id: string,
    items: readonly T[],
    sourceItems: MediaSourceItems,
    complete: boolean,
    parent?: ParentOf<T>,
    onInternalSort?: (params: SortParams) => void
) {
    const defaultSort =
        sourceItems.sort?.defaultSort || (isAlbum(parent) ? defaultAlbumSort : undefined);
    const externalSortParams = useSorting(id);
    const [internalSortParams, setInternalSortParams] = useState<SortParams | undefined>();
    const [sortedItems, setSortedItems] = useState<readonly T[]>(items);
    const sortParams = internalSortParams || externalSortParams || defaultSort;
    const [savedSortParams, setSavedSortParams] = useState<SortParams | undefined>(
        () =>
            externalSortParams ||
            // Only store the default sort if there are sort options
            (sourceItems.sort?.sortOptions ? defaultSort : undefined)
    );
    const [sorting, setSorting] = useState(false);

    const onSort = useCallback(
        (params: SortParams) => {
            if (complete) {
                setSorting(true);
                setInternalSortParams(params);
            } else {
                setSourceSorting(id, params);
            }
        },
        [id, complete, setInternalSortParams]
    );

    useEffect(() => {
        if (externalSortParams) {
            setSavedSortParams(externalSortParams);
            setInternalSortParams(undefined);
        }
    }, [externalSortParams]);

    useEffect(() => {
        if (internalSortParams) {
            const {sortBy, sortOrder} = internalSortParams;
            setSortedItems(
                sorter.sort(items, sortBy as Field, sortOrder, getField(sortBy as Field)?.sortType)
            );
            setSorting(false);
        } else {
            setSortedItems(items);
        }
    }, [items, internalSortParams]);

    useEffect(() => {
        if (internalSortParams && onInternalSort) {
            onInternalSort(internalSortParams);
        }
    }, [internalSortParams, onInternalSort]);

    useEffect(() => {
        if (internalSortParams) {
            const externalSortKeys = Object.keys(sourceItems.sort?.sortOptions || {});
            if (externalSortKeys.includes(internalSortParams.sortBy)) {
                // If the internal sort matches an external sort then save it and use it next time.
                setSourceSorting(id, internalSortParams, true);
                setSavedSortParams(internalSortParams);
            }
        }
    }, [id, internalSortParams, sourceItems]);

    return {
        sortedItems: sorting ? [] : sortedItems,
        sortParams,
        savedSortParams,
        onSort,
    };
}

function isAlbum(item?: MediaObject): item is MediaAlbum {
    return item?.itemType === ItemType.Album && !item.synthetic;
}
