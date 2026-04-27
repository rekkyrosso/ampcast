import React, {useRef} from 'react';
import Button from 'components/Button';
import Dialog, {DialogProps} from 'components/Dialog';
import useCurrentTrack from 'hooks/useCurrentTrack';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useFirstValue from 'hooks/useFirstValue';
import CurrentlyPlayingTabs from './CurrentlyPlayingTabs';
import useActiveItem from './useActiveItem';
import useMediaInfoDialog from './useMediaInfoDialog';

export default function CurrentlyPlayingDialog(props: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const currentTrack = useCurrentTrack();
    const currentVisualizer = useCurrentVisualizer();
    const thisTrack = useFirstValue(currentTrack);
    const thisVisualizer = useFirstValue(currentVisualizer);
    const item = useActiveItem(thisTrack);
    const visualizer = thisVisualizer;
    useMediaInfoDialog(ref);

    return (
        <Dialog
            {...props}
            className={`currently-playing-dialog media-info-dialog ${item ? '' : 'empty'}`}
            icon="info"
            title="Media Info"
            ref={ref}
        >
            <form method="dialog">
                {item ? (
                    <CurrentlyPlayingTabs item={item} visualizer={visualizer} />
                ) : (
                    <p>No media loaded.</p>
                )}
                <footer className="dialog-buttons">
                    <Button>Close</Button>
                </footer>
            </form>
        </Dialog>
    );
}
