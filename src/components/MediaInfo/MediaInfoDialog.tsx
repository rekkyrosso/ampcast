import React, {useRef} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import preferences from 'services/preferences';
import Button from 'components/Button';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaInfo from './MediaInfo';
import MediaInfoTabs from './MediaInfoTabs';
import useActiveItem from './useActiveItem';
import useMediaInfoDialog from './useMediaInfoDialog';
import './MediaInfoDialog.scss';

export interface MediaInfoDialogOptions {
    scrobblingOptions?: boolean;
}

export type MediaInfoDialogProps<T extends MediaObject = MediaObject> = DialogProps & {
    item: T;
} & MediaInfoDialogOptions;

export async function showMediaInfoDialog<T extends MediaObject>(
    item: T,
    options?: MediaInfoDialogOptions
): Promise<void> {
    await showDialog((props: DialogProps) => (
        <MediaInfoDialog {...props} item={item} {...options} />
    ));
}

export default function MediaInfoDialog<T extends MediaObject>({
    item,
    scrobblingOptions,
    ...props
}: MediaInfoDialogProps<T>) {
    const ref = useRef<HTMLDialogElement>(null);
    const activeItem = useActiveItem(item);
    const title = useTitle(activeItem);
    useMediaInfoDialog(ref);

    return (
        <Dialog {...props} className="media-info-dialog" icon="info" title={title} ref={ref}>
            <form method="dialog">
                {preferences.mediaInfoTabs ? (
                    <MediaInfoTabs item={activeItem} scrobblingOptions={scrobblingOptions} />
                ) : (
                    <MediaInfo item={activeItem} scrobblingOptions={scrobblingOptions} />
                )}
                <footer className="dialog-buttons">
                    <Button>Close</Button>
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
