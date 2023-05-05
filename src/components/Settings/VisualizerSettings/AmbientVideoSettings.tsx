import React, {useCallback, useId, useRef, useState} from 'react';
import {getYouTubeSrc} from 'services/youtube';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function AmbientVideoSettings() {
    const id = useId();
    const enabledRef = useRef<HTMLInputElement>(null);
    const sourceRef = useRef<HTMLInputElement>(null);
    const useSourceRef = useRef<HTMLInputElement>(null);
    const beatsOverlayRef = useRef<HTMLInputElement>(null);
    const [useSource, setUseSource] = useState(() => !!visualizerSettings.useAmbientVideoSource);

    const handleSubmit = useCallback(() => {
        visualizerSettings.ambientVideoEnabled = enabledRef.current!.checked;
        visualizerSettings.useAmbientVideoSource = useSourceRef.current!.checked;
        visualizerSettings.ambientVideoSource = sourceRef.current!.value;
        visualizerSettings.beatsOverlay = beatsOverlayRef.current!.checked;
    }, []);

    const handleSourceChange = useCallback(() => {
        if (!sourceRef.current!.validity.valid && !useSourceRef.current!.checked) {
            sourceRef.current!.value = '';
        }
        setUseSource(useSourceRef.current!.checked);
    }, []);

    const handleSourceInput = useCallback(() => {
        const url = sourceRef.current!.value;
        let validityMessage = 'Not a valid YouTube url.';
        if (/^https?/.test(url) && /youtu\.?be/.test(url)) {
            validityMessage = 'Not a YouTube video or playlist.';
            if (getYouTubeSrc(url)) {
                validityMessage = '';
            }
        }
        sourceRef.current!.setCustomValidity(validityMessage);
    }, []);

    return (
        <form className="ambient-video-settings" method="dialog" onSubmit={handleSubmit}>
            <p>
                <input
                    id={`${id}-ambient-video-enabled`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.ambientVideoEnabled}
                    ref={enabledRef}
                />
                <label htmlFor={`${id}-ambient-video-enabled`}>Enable ambient video</label>
            </p>
            <fieldset>
                <legend>Source</legend>
                <p>
                    <input
                        type="radio"
                        name="video-source"
                        id={`${id}-source-default`}
                        defaultChecked={!visualizerSettings.useAmbientVideoSource}
                        onChange={handleSourceChange}
                    />
                    <label htmlFor={`${id}-source-default`}>Default videos</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="video-source"
                        id={`${id}-source-youtube`}
                        defaultChecked={visualizerSettings.useAmbientVideoSource}
                        onChange={handleSourceChange}
                        ref={useSourceRef}
                    />
                    <label id={`${id}-source-youtube-label`} htmlFor={`${id}-source-youtube`}>
                        YouTube video or playlist:
                    </label>
                </p>
                <p>
                    <input
                        type="url"
                        defaultValue={visualizerSettings.ambientVideoSource}
                        disabled={!useSource}
                        required={useSource}
                        onInput={handleSourceInput}
                        aria-labelledby={`${id}-source-youtube-label`}
                        ref={sourceRef}
                    />
                </p>
            </fieldset>
            <p>
                <input
                    id={`${id}-beats-overlay`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.beatsOverlay}
                    ref={beatsOverlayRef}
                />
                <label htmlFor={`${id}-beats-overlay`}>Show &quot;beats&quot; overlay</label>
            </p>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
