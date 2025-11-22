import React, {useCallback} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LibraryAction from 'types/LibraryAction';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import {getServiceFromSrc} from 'services/mediaServices';
import IconButton from 'components/Button';
import IconButtons from 'components/Button/IconButtons';
import PopupMenuButton from 'components/Button/PopupMenuButton';
import {IconName} from 'components/Icon';
import StarRating from 'components/StarRating';
import {showActionsMenu} from './ActionsMenu';
import {AddToPlaylistButton} from './PlaylistActions';
import performAction from './performAction';

export interface ActionsProps {
    item: MediaObject;
    inListView?: boolean; // Rendered in a `ListView` component.
    inInfoView?: boolean; // Rendered in a `MediaInfo` component.
    parentPlaylist?: MediaPlaylist;
    showMenu?: typeof showActionsMenu;
}

const defaultActionIcons: Record<LibraryAction, IconName> = {
    [Action.AddToLibrary]: 'heart',
    [Action.RemoveFromLibrary]: 'heart-fill',
    [Action.Rate]: 'star',
};

const defaultActionLabels: Record<LibraryAction, string> = {
    [Action.AddToLibrary]: 'Add to library',
    [Action.RemoveFromLibrary]: 'Remove from library',
    [Action.Rate]: 'Rate',
};

export default function Actions({
    item,
    inListView,
    inInfoView,
    parentPlaylist,
    showMenu = showActionsMenu,
}: ActionsProps) {
    const service = getServiceFromSrc(item);
    const tabIndex = inListView ? -1 : undefined;

    const togglePin = useCallback(() => {
        if (item.isPinned) {
            performAction(Action.Unpin, [item]);
        } else {
            performAction(Action.Pin, [item]);
        }
    }, [item]);

    const toggleInLibrary = useCallback(() => {
        if (item.inLibrary) {
            performAction(Action.RemoveFromLibrary, [item]);
        } else {
            performAction(Action.AddToLibrary, [item]);
        }
    }, [item]);

    const handleMenuClick = useCallback(
        async (button: HTMLButtonElement) => {
            const {right, bottom} = button.getBoundingClientRect();
            const action = await showMenu([item], button, right, bottom, 'right', {
                inListView,
                parentPlaylist,
            });
            if (action) {
                if (action === Action.DeletePlaylistItems) {
                    performAction(action, [item], parentPlaylist);
                } else {
                    performAction(action, [item]);
                }
            }
        },
        [item, inListView, parentPlaylist, showMenu]
    );

    const rate = useCallback(
        (rating: number) => {
            performAction(Action.Rate, [item], rating);
        },
        [item]
    );

    return (
        <IconButtons>
            {!inInfoView ? (
                <PopupMenuButton
                    title="More…"
                    tabIndex={tabIndex}
                    showPopup={handleMenuClick}
                    key="menu"
                />
            ) : null}

            {!inListView && item.itemType === ItemType.Media ? (
                <AddToPlaylistButton item={item} />
            ) : null}

            {!inListView && item.rating !== undefined && service?.canRate?.(item, inListView) ? (
                <StarRating
                    value={item.rating}
                    increment={service.starRatingIncrement}
                    tabIndex={tabIndex}
                    onChange={rate}
                />
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
