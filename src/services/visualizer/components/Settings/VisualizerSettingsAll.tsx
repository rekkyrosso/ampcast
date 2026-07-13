import React, {useId, useMemo} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function VisualizerSettingsAll() {
    const id = useId();
    const originalSettings = useMemo(() => ({...visualizerSettings}), []);

    return (
        <>
            <fieldset>
                <legend>Options</legend>
                <p>
                    <label htmlFor={`${id}-fallback-provider`}>Fallback:</label>
                    <select
                        id={`${id}-fallback-provider`}
                        defaultValue={originalSettings.fallbackProvider}
                        onChange={(e) =>
                            (visualizerSettings.fallbackProvider = e.target.value as any)
                        }
                    >
                        <option value="none">(none)</option>
                        <option value="coverart">Cover Art</option>
                    </select>
                </p>
            </fieldset>
            <fieldset>
                <legend>Fullscreen</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-fullscreen-progress`}
                        defaultChecked={visualizerSettings.fullscreenProgress}
                        onChange={(e) => (visualizerSettings.fullscreenProgress = e.target.checked)}
                    />
                    <label htmlFor={`${id}-fullscreen-progress`}>Always show progress bar</label>
                </p>
            </fieldset>
        </>
    );
}
