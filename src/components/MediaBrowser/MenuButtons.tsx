import React, {useCallback} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import {getService} from 'services/mediaServices';
import IconButton from 'components/Button';
import {showCreatePlaylistDialog} from 'components/Actions/CreatePlaylistDialog';
import {showMediaSourceMenu} from './MediaSourceMenu';
import './MenuButtons.scss';

export interface MenuButtonsProps<T extends MediaObject> {
    source: MediaSource<T>;
}

export default function MenuButtons<T extends MediaObject>({source}: MenuButtonsProps<T>) {
    const handleCreatePlaylistClick = useCallback(() => {
        showCreatePlaylistDialog([], getService('localdb'));
    }, []);

    const handleOptionsClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const {right} = button.getBoundingClientRect();
            const {bottom} = (event.target as HTMLButtonElement).getBoundingClientRect();
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
                <IconButton title="Options…" icon="menu" onClick={handleOptionsClick} />
            ) : null}
        </div>
    );
}

function hasCreatePlaylistButton(source: MediaSource): boolean {
    return source.id === 'localdb/playlists';
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
