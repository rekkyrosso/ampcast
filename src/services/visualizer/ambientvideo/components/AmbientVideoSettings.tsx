import React, {useCallback, useId, useImperativeHandle, useRef, useState} from 'react';
import {VisualizerSettingsComponentHandle} from 'types/VisualizerComponents';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import youtubeApi from 'services/youtube/youtubeApi';

export interface AmbientVideoSettingsProps {
    ref?: React.Ref<VisualizerSettingsComponentHandle | null>;
}

export default function AmbientVideoSettings({ref}: AmbientVideoSettingsProps) {
    const id = useId();
    const ambientVideoSourceRef = useRef<HTMLInputElement>(null);
    const useAmbientVideoSourceRef = useRef<HTMLInputElement>(null);
    const [useSource, setUseSource] = useState(() => !!visualizerSettings.useAmbientVideoSource);

    useImperativeHandle(ref, () => ({
        submit: () => {
            visualizerSettings.useAmbientVideoSource = useAmbientVideoSourceRef.current!.checked;
            visualizerSettings.ambientVideoSource = ambientVideoSourceRef.current!.value;
        },
    }));

    const handleSourceChange = useCallback(() => {
        const useAmbientVideoSource = useAmbientVideoSourceRef.current!.checked;
        if (
            !ambientVideoSourceRef.current!.validity.valid &&
            !useAmbientVideoSourceRef.current!.checked
        ) {
            ambientVideoSourceRef.current!.value = '';
        }
        setUseSource(useAmbientVideoSource);
    }, []);

    const handleSourceInput = useCallback(() => {
        const url = ambientVideoSourceRef.current!.value;
        let validityMessage = 'Not a valid YouTube url.';
        if (/^https?/.test(url) && /youtu\.?be/.test(url)) {
            validityMessage = 'Not a YouTube video or playlist.';
            if (youtubeApi.getVideoSrc(url)) {
                validityMessage = '';
            }
        }
        ambientVideoSourceRef.current!.setCustomValidity(validityMessage);
    }, []);

    return (
        <div className="ambient-video-settings">
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
                        ref={useAmbientVideoSourceRef}
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
                        ref={ambientVideoSourceRef}
                    />
                </p>
            </fieldset>
            <fieldset>
                <legend>Options</legend>
                <p>
                    <input
                        id={`${id}-beats-overlay`}
                        type="checkbox"
                        defaultChecked={visualizerSettings.ambientVideoBeats}
                        onChange={(e) => (visualizerSettings.ambientVideoBeats = e.target.checked)}
                    />
                    <label htmlFor={`${id}-beats-overlay`}>Show &quot;beats&quot; overlay</label>
                </p>
            </fieldset>
        </div>
    );
}
