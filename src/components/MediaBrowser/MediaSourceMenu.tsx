import React from 'react';
import ItemType from 'types/ItemType';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import {getMediaLabel} from 'utils';
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

export async function showMediaSourceMenu(
    source: MediaSource<any>,
    target: HTMLElement,
    x: number,
    y: number
): Promise<void> {
    await showPopupMenu(
        (props: PopupMenuProps) => <MediaSourceMenu {...props} source={source} />,
        target,
        x,
        y,
        'right'
    );
}

interface MediaSourceMenuProps {
    source: MediaSource<any>;
}

function MediaSourceMenu({source, ...props}: PopupMenuProps & MediaSourceMenuProps) {
    return (
        <PopupMenu {...props}>
            <MediaSourceMenuItems source={source} />
        </PopupMenu>
    );
}

export function MediaSourceMenuItems({source}: MediaSourceMenuProps) {
    const primaryMenuItems = getMenuItems(source, 1, source.itemType);
    let secondaryMenuItems: MenuItems | undefined;
    let tertiaryMenuItems: MenuItems | undefined;
    if (source.secondaryItems?.layout?.view !== 'none' && source.itemType !== ItemType.Media) {
        const itemType = source.itemType === ItemType.Artist ? ItemType.Album : ItemType.Media;
        secondaryMenuItems = getMenuItems(source, 2, itemType);
        if (source.tertiaryItems?.layout?.view !== 'none' && source.itemType === ItemType.Artist) {
            tertiaryMenuItems = getMenuItems(source, 3, ItemType.Media);
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
                    getMenuItem(secondaryMenuItems, 2, 'sort'),
                    getMenuItem(secondaryMenuItems, 2, 'view'),
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

function getMenuItems(source: MediaSource<any>, level: 1 | 2 | 3, itemType: ItemType): MenuItems {
    const id = `${source.sourceId || source.id}/${level}`;
    const items: MediaSourceItems | undefined =
        level === 3
            ? source.tertiaryItems
            : level === 2
            ? source.secondaryItems
            : source.primaryItems;
    const menuItems: MenuItems = {
        label: items?.label || getDefaultLabel(source.id, itemType),
    };
    if (items?.sort) {
        const sorting = getSourceSorting(id) || items.sort.defaultSort;
        const sortOptions = items.sort.sortOptions;
        menuItems.sort = (
            <>
                <PopupMenuItemGroup>
                    {Object.keys(sortOptions).map((sortBy) => (
                        <PopupMenuItemRadio
                            label={`Sort by: ${sortOptions[sortBy]}`}
                            checked={sorting.sortBy === sortBy}
                            onClick={() => setSourceSorting(id, sortBy, sorting.sortOrder)}
                            key={sortBy}
                        />
                    ))}
                </PopupMenuItemGroup>
                <PopupMenuSeparator />
                <PopupMenuItemGroup>
                    <PopupMenuItemRadio
                        label="Sort Ascending"
                        checked={sorting.sortOrder === 1}
                        onClick={() => setSourceSorting(id, sorting.sortBy, 1)}
                        key="1"
                    />
                    <PopupMenuItemRadio
                        label="Sort Descending"
                        checked={sorting.sortOrder === -1}
                        onClick={() => setSourceSorting(id, sorting.sortBy, -1)}
                        key="-1"
                    />
                </PopupMenuItemGroup>
            </>
        );
    }
    const views = items?.layout?.views || ['card', 'card compact', 'card small', 'details'];
    const listView = document.getElementById(id);
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
