import React, {useCallback} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LibraryAction from 'types/LibraryAction';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import {performAction} from 'services/actions';
import {getService} from 'services/mediaServices';
import IconButton from 'components/Button';
import IconButtons from 'components/Button/IconButtons';
import {IconName} from 'components/Icon';
import showActionsMenu from 'components/MediaList/showActionsMenu';
import StarRating from 'components/StarRating';

export interface ActionsProps {
    item: MediaObject;
    inline?: boolean;
}

export const actionIcons: Record<LibraryAction, IconName> = {
    [Action.AddToLibrary]: 'library-add',
    [Action.RemoveFromLibrary]: 'library-remove',
    [Action.Rate]: 'star',
    [Action.Like]: 'heart',
    [Action.Unlike]: 'heart-fill',
};

export const actionLabels: Record<LibraryAction, string> = {
    [Action.AddToLibrary]: 'Add to library',
    [Action.RemoveFromLibrary]: 'Remove from library',
    [Action.Rate]: 'Rate',
    [Action.Like]: 'Love',
    [Action.Unlike]: 'Unlove',
};

export default function Actions({item, inline}: ActionsProps) {
    const [serviceId] = item.src.split(':');
    const service = getService(serviceId);

    const togglePin = useCallback(async () => {
        if (item.itemType === ItemType.Playlist) {
            if (item.isPinned) {
                await performAction(Action.Unpin, [item]);
            } else {
                await performAction(Action.Pin, [item]);
            }
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

    const showContextMenu = useCallback(
        async (event: React.MouseEvent) => {
            const action = await showActionsMenu([item], event.pageX, event.pageY);
            if (action) {
                await performAction(action, [item]);
            }
        },
        [item]
    );

    const rate = useCallback(
        async (rating: number) => {
            await performAction(Action.Rate, [item], rating);
        },
        [item]
    );

    return (
        <IconButtons>
            {inline ? (
                <IconButton icon="menu" title="More..." onClick={showContextMenu} key="menu" />
            ) : null}

            {item.itemType === ItemType.Playlist ? (
                <IconButton
                    icon={item.isPinned ? 'pin-fill' : 'pin'}
                    title={item.isPinned ? 'Unpin' : 'Pin'}
                    onClick={togglePin}
                    key="pin"
                />
            ) : null}

            {service ? (
                <>
                    {item.rating !== undefined && service?.canRate(item, inline) ? (
                        serviceId === 'plex' ? (
                            <StarRating rating={item.rating} onClick={rate} />
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
                                onClick={toggleLike}
                                key="rate"
                            />
                        )
                    ) : null}

                    {item.inLibrary !== undefined && service?.canStore(item, inline) ? (
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
                            disabled={serviceId === 'apple' && item.inLibrary} // remove doesn't work (https://developer.apple.com/forums/thread/107807)
                            onClick={toggleInLibrary}
                            key="store"
                        />
                    ) : null}
                </>
            ) : null}
        </IconButtons>
    );
}

export function getIconForAction(service: MediaService, action: LibraryAction): IconName {
    return service.icons?.[action] || actionIcons[action];
}

export function getLabelForAction(service: MediaService, action: LibraryAction): string {
    return service.labels?.[action] || actionLabels[action];
}
