import React, {useCallback} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LibraryAction from 'types/LibraryAction';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import {getServiceFromSrc} from 'services/mediaServices';
import IconButton from 'components/Button';
import IconButtons from 'components/Button/IconButtons';
import {IconName} from 'components/Icon';
import StarRating from 'components/StarRating';
import {showActionsMenu} from './ActionsMenu';
import {AddToPlaylistButton} from './PlaylistActions';
import performAction from './performAction';

export interface ActionsProps {
    item: MediaObject;
    inListView?: boolean; // Rendered in a `ListView` component.
    inInfoView?: boolean; // Rendered in a `MediaInfo` component.
    showMenu?: typeof showActionsMenu;
}

const defaultActionIcons: Record<LibraryAction, IconName> = {
    [Action.AddToLibrary]: 'heart',
    [Action.RemoveFromLibrary]: 'heart-fill',
    [Action.Rate]: 'star',
    [Action.Like]: 'heart',
    [Action.Unlike]: 'heart-fill',
};

const defaultActionLabels: Record<LibraryAction, string> = {
    [Action.AddToLibrary]: 'Add to library',
    [Action.RemoveFromLibrary]: 'Remove from library',
    [Action.Rate]: 'Rate',
    [Action.Like]: 'Like',
    [Action.Unlike]: 'Unlike',
};

export default function Actions({
    item,
    inListView,
    inInfoView,
    showMenu = showActionsMenu,
}: ActionsProps) {
    const service = getServiceFromSrc(item);
    const tabIndex = inListView ? -1 : undefined;

    const togglePin = useCallback(async () => {
        if (item.isPinned) {
            await performAction(Action.Unpin, [item]);
        } else {
            await performAction(Action.Pin, [item]);
        }
    }, [item]);

    const toggleLike = useCallback(async () => {
        if (item.rating) {
            await performAction(Action.Unlike, [item]);
        } else {
            await performAction(Action.Like, [item]);
        }
    }, [item]);

    const toggleInLibrary = useCallback(async () => {
        if (item.inLibrary) {
            await performAction(Action.RemoveFromLibrary, [item]);
        } else {
            await performAction(Action.AddToLibrary, [item]);
        }
    }, [item]);

    const handleMenuClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const rect = button.getBoundingClientRect();
            const action = await showMenu(
                [item],
                button,
                rect.right,
                rect.bottom,
                'right',
                inListView
            );
            if (action) {
                await performAction(action, [item]);
            }
        },
        [item, inListView, showMenu]
    );

    const rate = useCallback(
        async (rating: number) => {
            await performAction(Action.Rate, [item], rating);
        },
        [item]
    );

    return (
        <IconButtons>
            {!inInfoView ? (
                <IconButton
                    icon="menu"
                    title="More…"
                    tabIndex={tabIndex}
                    onClick={handleMenuClick}
                    key="menu"
                />
            ) : null}

            {item.rating !== undefined && service?.canRate?.(item, inListView) ? (
                service.id === 'plex' ? (
                    <StarRating value={item.rating} tabIndex={tabIndex} onChange={rate} />
                ) : (
                    <IconButton
                        icon={
                            item.rating
                                ? getIconForAction(service, Action.Unlike)
                                : getIconForAction(service, Action.Like)
                        }
                        title={
                            item.rating
                                ? getLabelForAction(service, Action.Unlike)
                                : getLabelForAction(service, Action.Like)
                        }
                        tabIndex={tabIndex}
                        onClick={toggleLike}
                        key="rate"
                    />
                )
            ) : null}

            {!inListView && item.itemType === ItemType.Media ? (
                <AddToPlaylistButton item={item} />
            ) : null}

            {service?.canPin?.(item, inListView) ? (
                <IconButton
                    icon={item.isPinned ? 'pin-fill' : 'pin'}
                    title={item.isPinned ? 'Unpin' : 'Pin to sidebar'}
                    tabIndex={tabIndex}
                    onClick={togglePin}
                    key="pin"
                />
            ) : null}

            {item.inLibrary !== undefined && service?.canStore?.(item, inListView) ? (
                <IconButton
                    icon={
                        item.inLibrary
                            ? getIconForAction(service, Action.RemoveFromLibrary)
                            : getIconForAction(service, Action.AddToLibrary)
                    }
                    title={
                        item.inLibrary
                            ? getLabelForAction(service, Action.RemoveFromLibrary)
                            : getLabelForAction(service, Action.AddToLibrary)
                    }
                    tabIndex={tabIndex}
                    disabled={service.id === 'apple' && item.inLibrary} // remove doesn't work (https://developer.apple.com/forums/thread/107807)
                    onClick={toggleInLibrary}
                    key="store"
                />
            ) : null}
        </IconButtons>
    );
}

export function getIconForAction(service: MediaService, action: LibraryAction): IconName {
    return service.icons?.[action] || defaultActionIcons[action];
}

export function getLabelForAction(service: MediaService, action: LibraryAction): string {
    return service.labels?.[action] || defaultActionLabels[action];
}
