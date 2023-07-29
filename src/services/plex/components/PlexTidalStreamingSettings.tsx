import React, {useCallback, useId, useRef} from 'react';
import StreamingQuality from 'types/StreamingQuality';
import DialogButtons from 'components/Dialog/DialogButtons';
import plexSettings from '../plexSettings';

export default function PlexTidalStreamingSettings() {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const streamingQuality = plexSettings.streamingQuality;

    const handleSubmit = useCallback(() => {
        plexSettings.streamingQuality =
            ref.current!['streaming-quality']?.value ?? StreamingQuality.Lossless;
    }, []);

    return (
        <form
            className="plex-tidal-streaming-settings"
            method="dialog"
            onSubmit={handleSubmit}
            ref={ref}
        >
            <fieldset>
                <legend>Quality</legend>
                <p>
                    <input
                        type="radio"
                        name="streaming-quality"
                        id={`${id}-lossless`}
                        value={StreamingQuality.Lossless}
                        defaultChecked={streamingQuality === StreamingQuality.Lossless}
                    />
                    <label htmlFor={`${id}-lossless`}>Lossless</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="streaming-quality"
                        id={`${id}-high`}
                        value={StreamingQuality.High}
                        defaultChecked={streamingQuality === StreamingQuality.High}
                    />
                    <label htmlFor={`${id}-high`}>High</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="streaming-quality"
                        id={`${id}-low`}
                        value={StreamingQuality.Low}
                        defaultChecked={streamingQuality === StreamingQuality.Low}
                    />
                    <label htmlFor={`${id}-low`}>Low</label>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
