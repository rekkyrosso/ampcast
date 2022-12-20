import React from 'react';
import MediaObject from 'types/MediaObject';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaInfo from './MediaInfo';
import './MediaInfoDialog.scss';
import ItemType from 'types/ItemType';

export interface MediaInfoDialogProps<T extends MediaObject = MediaObject> extends DialogProps {
    item: T;
}

export function showMediaInfoDialog<T extends MediaObject>(item: T): void {
    showDialog((props: DialogProps) => <MediaInfoDialog {...props} item={item} />);
}

export default function MediaInfoDialog<T extends MediaObject>({item, ...props}: MediaInfoDialogProps<T>) {
    const title = getTitle(item);

    return (
        <Dialog {...props} className="media-info-dialog" title={title}>
            <form method="dialog">
                <MediaInfo item={item} />
                <footer className="dialog-buttons">
                    <button>Close</button>
                </footer>
            </form>
        </Dialog>
    );
}

function getTitle(item: MediaObject): string {
    switch (item.itemType) {
        case ItemType.Playlist:
            return 'Playlist info';

        case ItemType.Album:
            return 'Album info';

        case ItemType.Artist:
            return 'Artist info';

        default:
            return 'Media info';
    }

}
