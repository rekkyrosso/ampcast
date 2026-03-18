import React, {useCallback} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import PublicMediaService from 'types/PublicMediaService';
import {getService} from 'services/mediaServices';
import {IconButton, PopupMenuButton} from 'components/Button';
import {showCreatePlaylistDialog} from 'components/Actions/CreatePlaylistDialog';
import {showDialog} from 'components/Dialog';
import {showMediaSourceMenu} from './MediaSourceMenu';
import './MenuButtons.scss';

export interface MenuButtonsProps<T extends MediaObject> {
    source: MediaSource<T>;
}

export default function MenuButtons<T extends MediaObject>({source}: MenuButtonsProps<T>) {
    const createPlaylist = useCallback(() => {
        const [serviceId] = source.id.split('/');
        showCreatePlaylistDialog([], getService(serviceId));
    }, [source]);

    const createStation = useCallback(() => {
        const internetRadio = getService<PublicMediaService>('internet-radio');
        const CreateStationDialog = internetRadio?.Components?.CreateStationDialog;
        if (CreateStationDialog) {
            showDialog((props) => <CreateStationDialog {...props} service={internetRadio} />);
        }
    }, []);

    const showOptionsMenu = useCallback(
        async (button: HTMLButtonElement) => {
            const {right, bottom} = button.getBoundingClientRect();
            await showMediaSourceMenu(source, button, right, bottom + 4);
        },
        [source]
    );

    return (
        <div className="menu-buttons icon-buttons">
            {canCreatePlaylist(source) ? (
                <IconButton title="New playlist…" icon="add" onClick={createPlaylist} />
            ) : canAddStation(source) ? (
                <IconButton title="Add station…" icon="add" onClick={createStation} />
            ) : null}
            {hasOptions(source) ? (
                <PopupMenuButton title="Options…" showPopup={showOptionsMenu} />
            ) : null}
        </div>
    );
}

function canAddStation(source: MediaSource): boolean {
    return source.id === 'internet-radio/my-stations';
}

function canCreatePlaylist(source: MediaSource): boolean {
    // TODO: Make a better test for this.
    return /(ibroadcast|localdb)\/playlists/.test(source.id);
}

function hasOptions(source: MediaSource): boolean {
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
