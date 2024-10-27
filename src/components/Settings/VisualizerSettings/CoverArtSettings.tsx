import React, {useId} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface CoverArtSettingsProps {
    onCancel: () => void;
    onSubmit: () => void;
}

export default function CoverArtSettings({onCancel, onSubmit}: CoverArtSettingsProps) {
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
                        onChange={(e) => (visualizerSettings.coverArtBeats = e.target.checked)}
                    />
                    <label htmlFor={`${id}-beats-overlay`}>Show &quot;beats&quot; overlay</label>
                </p>
                <p>
                    <input
                        id={`${id}-animated-background`}
                        type="checkbox"
                        defaultChecked={visualizerSettings.coverArtAnimatedBackground}
                        onChange={(e) =>
                            (visualizerSettings.coverArtAnimatedBackground = e.target.checked)
                        }
                    />
                    <label htmlFor={`${id}-animated-background`}>
                        Animated background (experimental)
                    </label>
                </p>
            </fieldset>
            <DialogButtons onCancelClick={onCancel} onSubmitClick={onSubmit} />
        </form>
    );
}
