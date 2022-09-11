import React from 'react';
import MediaObject from 'types/MediaObject';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import Button from 'components/Button';
import MediaInfo from './MediaInfo';
import './MediaInfoDialog.scss';

export interface MediaInfoDialogProps<T extends MediaObject = MediaObject> extends DialogProps {
    item: T;
}

export function showMediaInfoDialog<T extends MediaObject>(item: T): void {
    showDialog((props: DialogProps) => <MediaInfoDialog {...props} item={item} />);
}

export default function MediaInfoDialog<T extends MediaObject>({item, ...props}: MediaInfoDialogProps<T>) {
    return (
        <Dialog {...props} className="media-info-dialog" title="Media Info">
            <form method="dialog">
                <MediaInfo item={item} />
                <footer className="dialog-buttons">
                    <Button>Close</Button>
                </footer>
            </form>
        </Dialog>
    );
}
