import React, {useRef} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Button from 'components/Button';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import useFirstValue from 'hooks/useFirstValue';
import MediaInfoTabs from './MediaInfoTabs';
import NavigationButton from './NavigationButton';
import useMediaInfoDialog from './useMediaInfoDialog';
import './MediaInfoDialog.scss';

export interface MediaInfoDialogOptions {
    allowNavigation?: boolean;
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
    allowNavigation,
    scrobblingOptions,
    ...props
}: MediaInfoDialogProps<T>) {
    const ref = useRef<HTMLDialogElement>(null);
    const initialItem = useFirstValue(item);
    const title = useTitle(initialItem);
    useMediaInfoDialog(ref);

    return (
        <Dialog {...props} className="media-info-dialog" icon="info" title={title} ref={ref}>
            <form method="dialog">
                <MediaInfoTabs item={initialItem} scrobblingOptions={scrobblingOptions} />
                <footer className="dialog-buttons">
                    {allowNavigation ? <NavigationButton item={initialItem} /> : null}
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
