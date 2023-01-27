import React, {useCallback} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {performAction} from 'services/actions';
import {getService} from 'services/mediaServices';
import IconButton from 'components/Button';
import IconButtons from 'components/Button/IconButtons';
import showActionsMenu from 'components/MediaList/showActionsMenu';
import {stopPropagation} from 'utils';

export interface ActionsProps {
    item: MediaObject;
    inline?: boolean;
}

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

    return (
        <IconButtons onMouseDown={stopPropagation} onMouseUp={stopPropagation}>
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

            {service?.canStore(item, inline) ? (
                <IconButton
                    icon={item.inLibrary ? 'library-remove' : 'library-add'}
                    title={item.inLibrary ? 'In library' : 'Add to library'}
                    disabled={item.inLibrary} // remove doesn't work (https://developer.apple.com/forums/thread/107807)
                    onClick={toggleInLibrary}
                    key="inLibrary"
                />
            ) : null}

            {service?.canRate(item, inline) ? (
                <IconButton
                    icon={item.rating ? 'heart-fill' : 'heart'}
                    title={item.rating ? 'Unlike' : 'Like'}
                    onClick={toggleLike}
                    key="like"
                />
            ) : null}
        </IconButtons>
    );
}
