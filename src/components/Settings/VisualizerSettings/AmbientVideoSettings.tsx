import React, {useCallback, useRef, useState} from 'react';
import {getYouTubeSrc} from 'services/youtube';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function AmbientVideoSettings() {
    const enabledRef = useRef<HTMLInputElement>(null);
    const beatsOverlayRef = useRef<HTMLInputElement>(null);
    const sourceRef = useRef<HTMLInputElement>(null);
    const useSourceRef = useRef<HTMLInputElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);
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

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) {
                submitRef.current!.click(); // forces form validation
            }
        }
    }, []);

    return (
        <form
            className="ambient-video-settings"
            method="dialog"
            onKeyDown={handleKeyDown}
            onSubmit={handleSubmit}
        >
            <p>
                <input
                    id="ambient-video-enabled"
                    type="checkbox"
                    defaultChecked={visualizerSettings.ambientVideoEnabled}
                    ref={enabledRef}
                />
                <label htmlFor="ambient-video-enabled">Enable ambient video</label>
            </p>
            <fieldset>
                <legend>Source</legend>
                <p>
                    <input
                        type="radio"
                        name="use-ambient-video-source"
                        id="use-ambient-video-source-default"
                        defaultChecked={!visualizerSettings.useAmbientVideoSource}
                        onChange={handleSourceChange}
                    />
                    <label htmlFor="use-ambient-video-source-default">Default videos</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="use-ambient-video-source"
                        id="use-ambient-video-source-youtube"
                        defaultChecked={visualizerSettings.useAmbientVideoSource}
                        onChange={handleSourceChange}
                        ref={useSourceRef}
                    />
                    <label htmlFor="use-ambient-video-source-youtube">
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
                        ref={sourceRef}
                    />
                </p>
            </fieldset>
            <p>
                <input
                    id="beats-overlay"
                    type="checkbox"
                    defaultChecked={visualizerSettings.beatsOverlay}
                    ref={beatsOverlayRef}
                />
                <label htmlFor="beats-overlay">Show &quot;beats&quot; overlay</label>
            </p>
            <footer className="dialog-buttons">
                <button value="#cancel">Cancel</button>
                <button ref={submitRef}>Confirm</button>
            </footer>
        </form>
    );
}
