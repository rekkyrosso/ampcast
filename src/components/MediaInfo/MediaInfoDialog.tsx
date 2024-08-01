import React, {useRef} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaInfo from './MediaInfo';
import useMediaInfoDialog from './useMediaInfoDialog';
import './MediaInfoDialog.scss';

export interface MediaInfoDialogProps<T extends MediaObject = MediaObject> extends DialogProps {
    item: T;
}

export async function showMediaInfoDialog<T extends MediaObject>(item: T): Promise<void> {
    await showDialog((props: DialogProps) => <MediaInfoDialog {...props} item={item} />);
}

export default function MediaInfoDialog<T extends MediaObject>({
    item,
    ...props
}: MediaInfoDialogProps<T>) {
    const ref = useRef<HTMLDialogElement>(null);
    const {debug} = useMediaInfoDialog(ref);
    const title = useTitle(item);

    return (
        <Dialog {...props} className="media-info-dialog" icon="info" title={title} ref={ref}>
            <form method="dialog">
                <MediaInfo item={item} debug={debug} />
                <footer className="dialog-buttons">
                    <button>Close</button>
                </footer>
            </form>
        </Dialog>
    );
}

function useTitle(item: MediaObject): string {
    switch (item.itemType) {
        case ItemType.Playlist:
            return 'Playlist info';

        case ItemType.Album:
            return 'Album info';

        case ItemType.Artist:
            return 'Artist info';

        case ItemType.Folder:
            return 'Folder info';

        default:
            return 'Media info';
    }
}
