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

const albumTracksSort: SortParams = {
    sortBy: 'Track',
    sortOrder: 1,
};

export default function useMediaListSort<T extends MediaObject>(
    id: string,
    items: readonly T[],
    isSearchResult: boolean,
    sourceItems: MediaSourceItems,
    complete: boolean,
    parent?: ParentOf<T>,
    onInternalSort?: (params: SortParams) => void
) {
    const defaultSort = isSearchResult
        ? undefined
        : sourceItems.sort?.defaultSort || (isAlbum(parent) ? albumTracksSort : undefined);
    const externalSortParams = useSorting(isSearchResult ? '' : id);
    const [internalSortParams, setInternalSortParams] = useState<SortParams | undefined>();
    const [sortedItems, setSortedItems] = useState<readonly T[]>(items);
    const sortParams = internalSortParams || externalSortParams || defaultSort;
    const [savedSortParams, setSavedSortParams] = useState<SortParams | undefined>(() =>
        isSearchResult
            ? undefined
            : externalSortParams ||
              // Only store the default sort if there are sort options
              (sourceItems.sort?.sortOptions ? defaultSort : undefined)
    );
    const [sorting, setSorting] = useState(false);
    const size = items.length;

    const onSort = useCallback(
        (params: SortParams) => {
            if (complete) {
                setSorting(true);
                setInternalSortParams(params);
            } else {
                setSourceSorting(id, params);
            }
        },
        [id, complete]
    );

    useEffect(() => {
        document.body.classList.toggle('busy', sorting && size > 10_000);
    }, [sorting, size]);

    useEffect(() => {
        if (externalSortParams && !isSearchResult) {
            setSavedSortParams(externalSortParams);
            setInternalSortParams(undefined);
        }
    }, [externalSortParams, isSearchResult]);

    useEffect(() => {
        if (internalSortParams) {
            const {sortBy, sortOrder} = internalSortParams;
            const timerId = setTimeout(() => {
                setSortedItems(sorter.sort(items, sortBy as Field, sortOrder));
                setSorting(false);
            });
            return () => clearTimeout(timerId);
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
        if (internalSortParams && !isSearchResult) {
            const externalSortKeys = Object.keys(sourceItems.sort?.sortOptions || {});
            if (externalSortKeys.includes(internalSortParams.sortBy)) {
                // If the internal sort matches an external sort then save it and use it next time.
                setSourceSorting(id, internalSortParams, true);
                setSavedSortParams(internalSortParams);
            }
        }
    }, [id, internalSortParams, sourceItems, isSearchResult]);

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
