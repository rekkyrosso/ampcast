import React, {useCallback, useEffect, useId, useMemo, useRef} from 'react';
import ReplayGainMode from 'types/ReplayGainMode';
import audioSettings from 'services/audio/audioSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import './AudioSettings.scss';

export default function AudioSettings() {
    const id = useId();
    const submitted = useRef(false);
    const originalSettings = useMemo(() => ({...audioSettings}), []);
    const currentItem = useCurrentlyPlaying();
    const hasReplayGainMetadata = (currentItem?.albumGain ?? currentItem?.trackGain) != null;

    const handleSubmit = useCallback(() => {
        submitted.current = true;
    }, []);

    useEffect(() => {
        return () => {
            if (!submitted.current) {
                Object.assign(audioSettings, originalSettings);
            }
        };
    }, [originalSettings]);

    return (
        <form className="audio-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>ReplayGain</legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-mode`}>Mode:</label>
                        <select
                            className="rg-mode-selector"
                            id={`${id}-mode`}
                            defaultValue={originalSettings.replayGainMode}
                            onChange={(e) =>
                                (audioSettings.replayGainMode = e.target.value as ReplayGainMode)
                            }
                        >
                            <option value="" key="">
                                Off
                            </option>
                            <option value="album" key="album">
                                Album
                            </option>
                            <option value="track" key="track">
                                Track
                            </option>
                        </select>
                    </p>
                    <p>
                        <label htmlFor={`${id}-preamp`}>Preamp (db):</label>
                        <input
                            type="number"
                            defaultValue={originalSettings.replayGainPreAmp}
                            min="-15"
                            max="15"
                            step="0.2"
                            onChange={(e) =>
                                (audioSettings.replayGainPreAmp = e.target.valueAsNumber)
                            }
                        />
                    </p>
                </div>
            </fieldset>
            {currentItem && !hasReplayGainMetadata ? (
                <p className="warning">ReplayGain metadata not found for current media.</p>
            ) : null}
            <DialogButtons />
        </form>
    );
}
