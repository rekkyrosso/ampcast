import React, {useCallback, useId, useState} from 'react';
import youtubeApi from 'services/youtube/youtubeApi';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface AmbientVideoSettingsProps {
    onAmbientVideoEnabledChange: (enabled: boolean) => void;
    ambientVideoEnabledRef: React.RefObject<HTMLInputElement>;
    ambientVideoSourceRef: React.RefObject<HTMLInputElement>;
    useAmbientVideoSourceRef: React.RefObject<HTMLInputElement>;
    onCancel: () => void;
    onSubmit: () => void;
}

export default function AmbientVideoSettings({
    ambientVideoEnabledRef,
    ambientVideoSourceRef,
    useAmbientVideoSourceRef,
    onAmbientVideoEnabledChange,
    onCancel,
    onSubmit,
}: AmbientVideoSettingsProps) {
    const id = useId();
    const [useSource, setUseSource] = useState(() => !!visualizerSettings.useAmbientVideoSource);

    const handleSourceChange = useCallback(() => {
        if (
            !ambientVideoSourceRef.current!.validity.valid &&
            !useAmbientVideoSourceRef.current!.checked
        ) {
            ambientVideoSourceRef.current!.value = '';
        }
        setUseSource(useAmbientVideoSourceRef.current!.checked);
    }, [ambientVideoSourceRef, useAmbientVideoSourceRef]);

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
    }, [ambientVideoSourceRef]);

    const handleAmbientVideoEnabledChange = useCallback(() => {
        onAmbientVideoEnabledChange(ambientVideoEnabledRef.current!.checked);
    }, [ambientVideoEnabledRef, onAmbientVideoEnabledChange]);

    return (
        <form className="ambient-video-settings" method="dialog">
            <p>
                <input
                    id={`${id}-ambient-video-enabled`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.ambientVideoEnabled}
                    onChange={handleAmbientVideoEnabledChange}
                    ref={ambientVideoEnabledRef}
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
            <p>
                <input
                    id={`${id}-beats-overlay`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.ambientVideoBeats}
                    onChange={(e) => (visualizerSettings.ambientVideoBeats = e.target.checked)}
                />
                <label htmlFor={`${id}-beats-overlay`}>Show &quot;beats&quot; overlay</label>
            </p>
            <DialogButtons onCancelClick={onCancel} onSubmitClick={onSubmit} />
        </form>
    );
}
