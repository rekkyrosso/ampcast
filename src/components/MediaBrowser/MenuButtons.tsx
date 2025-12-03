import React, {useCallback} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import {getService} from 'services/mediaServices';
import IconButton from 'components/Button';
import PopupMenuButton from 'components/Button/PopupMenuButton';
import {showCreatePlaylistDialog} from 'components/Actions/CreatePlaylistDialog';
import {showMediaSourceMenu} from './MediaSourceMenu';
import './MenuButtons.scss';

export interface MenuButtonsProps<T extends MediaObject> {
    source: MediaSource<T>;
}

export default function MenuButtons<T extends MediaObject>({source}: MenuButtonsProps<T>) {
    const handleCreatePlaylistClick = useCallback(() => {
        const [serviceId] = source.id.split('/');
        showCreatePlaylistDialog([], getService(serviceId));
    }, [source]);

    const handleOptionsClick = useCallback(
        async (button: HTMLButtonElement) => {
            const {right, bottom} = button.getBoundingClientRect();
            await showMediaSourceMenu(source, button, right, bottom + 4);
        },
        [source]
    );

    return (
        <div className="menu-buttons icon-buttons">
            {hasCreatePlaylistButton(source) ? (
                <IconButton
                    title="Create playlist…"
                    icon="add"
                    onClick={handleCreatePlaylistClick}
                />
            ) : null}
            {hasOptionsButton(source) ? (
                <PopupMenuButton title="Options…" showPopup={handleOptionsClick} />
            ) : null}
        </div>
    );
}

function hasCreatePlaylistButton(source: MediaSource): boolean {
    // TODO: Make a better test for this.
    return /(ibroadcast|localdb)\/playlists/.test(source.id);
}

function hasOptionsButton(source: MediaSource): boolean {
    const hasOptions = (items?: MediaSourceItems) => {
        return items?.sort || items?.layout?.views?.length !== 0;
    };
    if (hasOptions(source.primaryItems)) {
        return true;
    } else if (
        source.itemType !== ItemType.Media &&
        source.secondaryItems?.layout?.view !== 'none'
    ) {
        if (hasOptions(source.secondaryItems)) {
            return true;
        } else if (
            source.itemType === ItemType.Artist &&
            source.tertiaryItems?.layout?.view !== 'none' &&
            hasOptions(source.tertiaryItems)
        ) {
            return true;
        }
    }
    return false;
}
