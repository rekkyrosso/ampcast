import React, {useId} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface CoverArtSettingsProps {
    animatedBackgroundEnabledRef: React.RefObject<HTMLInputElement>;
    beatsOverlayEnabledRef: React.RefObject<HTMLInputElement>;
    onSubmit: () => void;
}

export default function CoverArtSettings({
    animatedBackgroundEnabledRef,
    beatsOverlayEnabledRef,
    onSubmit,
}: CoverArtSettingsProps) {
    const id = useId();

    return (
        <form className="cover-art-settings" method="dialog">
            <fieldset>
                <legend>Options</legend>
                <p>
                    <input
                        id={`${id}-beats-overlay`}
                        type="checkbox"
                        defaultChecked={visualizerSettings.coverArtBeats}
                        ref={beatsOverlayEnabledRef}
                    />
                    <label htmlFor={`${id}-beats-overlay`}>Show &quot;beats&quot; overlay</label>
                </p>
                <p>
                    <input
                        id={`${id}-animated-background`}
                        type="checkbox"
                        defaultChecked={visualizerSettings.coverArtAnimatedBackground}
                        ref={animatedBackgroundEnabledRef}
                    />
                    <label htmlFor={`${id}-animated-background`}>
                        Animated background (experimental)
                    </label>
                </p>
            </fieldset>
            <DialogButtons onSubmitClick={onSubmit} />
        </form>
    );
}
