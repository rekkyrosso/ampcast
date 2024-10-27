import React, {useRef} from 'react';
import MediaType from 'types/MediaType';
import Dialog, {DialogProps} from 'components/Dialog';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useFirstValue from 'hooks/useFirstValue';
import MediaInfo from './MediaInfo';
import VisualizerInfo from './VisualizerInfo';
import useMediaInfoDialog from './useMediaInfoDialog';

export default function CurrentlyPlayingDialog(props: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const currentlyPlaying = useCurrentlyPlaying();
    const currentVisualizer = useCurrentVisualizer();
    const item = useFirstValue(currentlyPlaying);
    const visualizer = useFirstValue(currentVisualizer);
    useMediaInfoDialog(ref);

    return (
        <Dialog
            {...props}
            className="currently-playing-dialog media-info-dialog"
            icon="info"
            title="Media Info"
            ref={ref}
        >
            <form method="dialog">
                {item ? <MediaInfo item={item} /> : <p>No media loaded.</p>}
                {item && item.mediaType !== MediaType.Video ? (
                    <VisualizerInfo visualizer={visualizer} />
                ) : null}
                <footer className="dialog-buttons">
                    <button>Close</button>
                </footer>
            </form>
        </Dialog>
    );
}
