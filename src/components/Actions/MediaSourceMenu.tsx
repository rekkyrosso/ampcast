import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaSource from 'types/MediaSource';
import {SortField} from 'types/MediaListSort';
import SortParams from 'types/SortParams';
import {getMediaLabel} from 'utils';
import {getMediaListId, getMediaSourceItems} from 'services/mediaServices/mediaSources';
import {
    getSourceSorting,
    setSourceView,
    setSourceSorting,
} from 'services/mediaServices/servicesSettings';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuItemGroup,
    PopupMenuItemRadio,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';

export interface ShowMediaSourceMenuParams {
    source: MediaSource<any>;
    target: HTMLElement;
    x: number;
    y: number;
    isSearch?: boolean;
    syntheticAlbum?: MediaAlbum;
}

export async function showMediaSourceMenu({
    target,
    x,
    y,
    ...params
}: ShowMediaSourceMenuParams): Promise<void> {
    await showPopupMenu(
        (props: PopupMenuProps) => <MediaSourceMenu {...props} {...params} />,
        target,
        x,
        y,
        'right'
    );
}

export type MediaSourceMenuItemsProps = Pick<
    ShowMediaSourceMenuParams,
    'source' | 'isSearch' | 'syntheticAlbum'
>;

function MediaSourceMenu({
    source,
    isSearch,
    syntheticAlbum,
    ...props
}: PopupMenuProps & MediaSourceMenuItemsProps) {
    return (
        <PopupMenu {...props}>
            <MediaSourceMenuItems
                source={source}
                isSearch={isSearch}
                syntheticAlbum={syntheticAlbum}
            />
        </PopupMenu>
    );
}

export function MediaSourceMenuItems({
    source,
    isSearch,
    syntheticAlbum,
}: MediaSourceMenuItemsProps) {
    const primaryMenuItems = getMenuItems(source, 1, source.itemType, syntheticAlbum, isSearch);
    let secondaryMenuItems: MenuItems | undefined;
    let tertiaryMenuItems: MenuItems | undefined;
    if (source.singular && source.itemType === ItemType.Media) {
        secondaryMenuItems = getMenuItems(source, 2, ItemType.Media, syntheticAlbum);
    } else if (
        source.secondaryItems?.layout?.view !== 'none' &&
        source.itemType !== ItemType.Media
    ) {
        const itemType = source.itemType === ItemType.Artist ? ItemType.Album : ItemType.Media;
        secondaryMenuItems = getMenuItems(source, 2, itemType, syntheticAlbum);
        if (source.tertiaryItems?.layout?.view !== 'none' && source.itemType === ItemType.Artist) {
            tertiaryMenuItems = getMenuItems(source, 3, ItemType.Media, syntheticAlbum);
        }
    }
    if (secondaryMenuItems) {
        const getMenuItem = (menu: MenuItems | undefined, level = 1, type: 'sort' | 'view') =>
            menu?.[type] ? (
                <PopupMenuItem
                    label={`${menu.label}: ${type === 'sort' ? 'Sort' : 'View'}`}
                    key={`${type}${level}`}
                >
                    {menu[type]}
                </PopupMenuItem>
            ) : null;
        return (
            <>
                {[
                    getMenuItem(primaryMenuItems, 1, 'sort'),
                    getMenuItem(primaryMenuItems, 1, 'view'),
                    <PopupMenuSeparator key="s-1" />,
                    getMenuItem(secondaryMenuItems, 2, 'sort'),
                    getMenuItem(secondaryMenuItems, 2, 'view'),
                    <PopupMenuSeparator key="s-2" />,
                    getMenuItem(tertiaryMenuItems, 3, 'sort'),
                    getMenuItem(tertiaryMenuItems, 3, 'view'),
                ]}
            </>
        );
    } else if (primaryMenuItems.sort && primaryMenuItems.view) {
        return (
            <>
                <PopupMenuItem label="Sort" key="sort">
                    {primaryMenuItems.sort}
                </PopupMenuItem>
                <PopupMenuItem label="View" key="view">
                    {primaryMenuItems.view}
                </PopupMenuItem>
            </>
        );
    }
    return <>{primaryMenuItems.sort || primaryMenuItems.view}</>;
}

interface MenuItems {
    label: string;
    sort?: React.ReactNode;
    view?: React.ReactNode;
}

function getMenuItems(
    source: MediaSource<any>,
    level: 1 | 2 | 3,
    itemType: ItemType,
    syntheticAlbum?: MediaAlbum,
    isSearch?: boolean
): MenuItems {
    const id = getMediaListId(source, level, syntheticAlbum);
    const items = getMediaSourceItems(source, level, syntheticAlbum);
    const menuItems: MenuItems = {
        label: items.label || getDefaultLabel(source.id, itemType),
    };
    if (source?.singular && level === 1) {
        return menuItems;
    }
    const listView = document.querySelector<HTMLElement>(
        `.history-item:not([hidden]) [data-list-id="${id}"]`
    );
    if (items.sort && !isSearch) {
        const sortBy = listView?.dataset.sortBy;
        const sortOrder = Number(listView?.dataset.sortOrder) || 0;
        const currentSort = sortBy && sortOrder ? ({sortBy, sortOrder} as SortParams) : undefined;
        const defaultSort = items.sort.defaultSort;
        const sorting = currentSort || getSourceSorting(id) || defaultSort;
        const sortOptions = items.sort.sortOptions || {};
        const sortKeys = Object.keys(sortOptions);
        if (sortKeys.length > 1) {
            menuItems.sort = (
                <>
                    <PopupMenuItemGroup>
                        {sortKeys.map((sortBy) => (
                            <PopupMenuItemRadio
                                label={`Sort by: ${sortOptions[sortBy as SortField]}`}
                                checked={sorting.sortBy === sortBy}
                                onClick={() =>
                                    setSourceSorting(id, {
                                        sortBy,
                                        sortOrder: guessBestSortOrder(sortBy, defaultSort),
                                    })
                                }
                                key={sortBy}
                            />
                        ))}
                    </PopupMenuItemGroup>
                    <PopupMenuSeparator />
                    <PopupMenuItemGroup>
                        <PopupMenuItemRadio
                            label="Sort Ascending"
                            checked={sorting.sortOrder === 1}
                            onClick={() => setSourceSorting(id, {...sorting, sortOrder: 1})}
                            key="1"
                        />
                        <PopupMenuItemRadio
                            label="Sort Descending"
                            checked={sorting.sortOrder === -1}
                            onClick={() => setSourceSorting(id, {...sorting, sortOrder: -1})}
                            key="-1"
                        />
                    </PopupMenuItemGroup>
                </>
            );
        }
    }
    const views = items.layout?.views || ['card', 'card compact', 'card small', 'details'];
    const currentView = listView?.dataset.view;
    menuItems.view = views.length ? (
        <PopupMenuItemGroup>
            {views.map((view) => (
                <PopupMenuItemRadio
                    label={getViewName(view)}
                    checked={currentView === view}
                    onClick={() => setSourceView(id, view)}
                    key={view}
                />
            ))}
        </PopupMenuItemGroup>
    ) : undefined;
    return menuItems;
}

function getViewName(view: string): string {
    switch (view) {
        case 'card':
            return 'Card: Large';

        case 'card compact':
            return 'Card: Medium';

        case 'card small':
            return 'Card: Small';

        case 'card minimal':
            return 'List';

        case 'details':
            return 'Details';

        default:
            return view;
    }
}

function getDefaultLabel(sourceId: string, itemType: ItemType): string {
    const [serviceId] = sourceId.split('/');
    return getMediaLabel(itemType, serviceId);
}

function guessBestSortOrder(sortBy: string, defaultSort: SortParams): 1 | -1 {
    if (sortBy === defaultSort.sortBy) {
        return defaultSort.sortOrder;
    }
    switch (sortBy) {
        case 'Year':
        case 'AddedAt':
        case 'ModifiedAt':
        case 'Released':
        case 'ListenDate':
        case 'LastPlayed':
        case 'Rating':
        case 'dateAdded':
        case 'starred_at':
            return -1;
        default:
            return 1;
    }
}
