import React, {useRef} from 'react';
import preferences from 'services/preferences';
import Dialog, {DialogProps} from 'components/Dialog';
import useCurrentTrack from 'hooks/useCurrentTrack';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useFirstValue from 'hooks/useFirstValue';
import useMediaInfoDialog from './useMediaInfoDialog';
import CurrentlyPlaying from './CurrentlyPlaying';
import CurrentlyPlayingTabs from './CurrentlyPlayingTabs';

export default function CurrentlyPlayingDialog(props: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const currentTrack = useCurrentTrack();
    const currentVisualizer = useCurrentVisualizer();
    const item = useFirstValue(currentTrack);
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
                {preferences.mediaInfoTabs ? (
                    <CurrentlyPlayingTabs item={item} visualizer={visualizer} />
                ) : (
                    <CurrentlyPlaying item={item} visualizer={visualizer} />
                )}
                <footer className="dialog-buttons">
                    <button>Close</button>
                </footer>
            </form>
        </Dialog>
    );
}
