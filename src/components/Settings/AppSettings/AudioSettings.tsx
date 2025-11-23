import React, {useCallback, useEffect, useId, useMemo, useRef} from 'react';
import ReplayGainMode from 'types/ReplayGainMode';
import {browser} from 'utils';
import {audioSettings} from 'services/audio';
import DialogButtons from 'components/Dialog/DialogButtons';
import useAudioSettings from 'hooks/useAudioSettings';
import useCurrentTrack from 'hooks/useCurrentTrack';
import './AudioSettings.scss';

export default function AudioSettings() {
    const id = useId();
    const submitted = useRef(false);
    const useSystemAudioRef = useRef<HTMLInputElement | null>(null);
    const originalSettings = useMemo(() => ({...audioSettings}), []);
    const currentTrack = useCurrentTrack();
    const {replayGainMode} = useAudioSettings();
    const hasReplayGainMetadata = (currentTrack?.albumGain ?? currentTrack?.trackGain) != null;

    const handleSubmit = useCallback(() => {
        submitted.current = true;
        audioSettings.useSystemAudio = useSystemAudioRef.current!.checked;
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
            {browser.isElectron ? (
                <fieldset>
                    <legend>System Audio</legend>
                    <p>
                        <input
                            type="checkbox"
                            id={`${id}-system-audio`}
                            defaultChecked={originalSettings.useSystemAudio}
                            ref={useSystemAudioRef}
                        />
                        <label htmlFor={`${id}-system-audio`}>
                            Enable system audio for visualizers
                        </label>
                    </p>
                    <p>
                        <small>
                            This will enable visualizers for Spotify, SoundCloud and Mixcloud.
                        </small>
                    </p>
                </fieldset>
            ) : null}
            <fieldset>
                <legend>Personal Media</legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-mode`}>ReplayGain:</label>
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
                        <label htmlFor={`${id}-preamp`}>Preamp:</label>
                        <input
                            type="number"
                            id={`${id}-preamp`}
                            defaultValue={originalSettings.replayGainPreAmp}
                            min="-15"
                            max="15"
                            step="0.2"
                            disabled={!replayGainMode}
                            onChange={(e) =>
                                (audioSettings.replayGainPreAmp = e.target.valueAsNumber)
                            }
                        />
                        <label htmlFor={`${id}-preamp`}>db</label>
                    </p>
                </div>
                {currentTrack && !hasReplayGainMetadata ? (
                    <p className="warning">ReplayGain metadata not found for current media.</p>
                ) : null}
            </fieldset>
            <DialogButtons />
        </form>
    );
}
