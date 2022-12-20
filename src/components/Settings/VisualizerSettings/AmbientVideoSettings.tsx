import React, {useCallback, useRef} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function AmbientVideoSettings() {
    const enabledRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(() => {
        visualizerSettings.ambientVideoEnabled = enabledRef.current!.checked;
    }, []);

    return (
        <form className="ambient-video-settings" method="dialog" onSubmit={handleSubmit}>
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
                        name="ambient-video-source"
                        id="ambient-video-source-default"
                        defaultChecked={!visualizerSettings.ambientVideoSource}
                    />
                    <label htmlFor="use-musickit-stable">Default</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="ambient-video-source"
                        id="ambient-video-source-other"
                        defaultChecked={!!visualizerSettings.ambientVideoSource}
                    />
                    <label htmlFor="use-musickit-beta">YouTube video or playlist</label>
                </p>
            </fieldset>
            <footer className="dialog-buttons">
                <button value="#cancel">Cancel</button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
