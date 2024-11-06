import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import PlexTidalStreamingQuality from '../PlexTidalStreamingQuality';
import plexSettings from '../plexSettings';

export default function PlexTidalStreamingSettings() {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const streamingQuality = plexSettings.streamingQuality;

    const handleSubmit = useCallback(() => {
        plexSettings.streamingQuality =
            ref.current!['streaming-quality']?.value ?? PlexTidalStreamingQuality.Lossless;
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
                        id={`${id}-low`}
                        value={PlexTidalStreamingQuality.Low}
                        defaultChecked={streamingQuality === PlexTidalStreamingQuality.Low}
                    />
                    <label htmlFor={`${id}-low`}>Low</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="streaming-quality"
                        id={`${id}-high`}
                        value={PlexTidalStreamingQuality.High}
                        defaultChecked={streamingQuality === PlexTidalStreamingQuality.High}
                    />
                    <label htmlFor={`${id}-high`}>High</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="streaming-quality"
                        id={`${id}-lossless`}
                        value={PlexTidalStreamingQuality.Lossless}
                        defaultChecked={streamingQuality === PlexTidalStreamingQuality.Lossless}
                    />
                    <label htmlFor={`${id}-lossless`}>Lossless</label>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
