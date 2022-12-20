import React, {useCallback, useRef} from 'react';
import VisualizerProvider from 'types/VisualizerProvider';
import visualizerSettings, {observeLocked} from 'services/visualizer/visualizerSettings';
import useObservable from 'hooks/useObservable';

export default function VisualizerSettingsGeneral() {
    const selectRef = useRef<HTMLSelectElement>(null);
    const provider = visualizerSettings.provider;
    const locked = useObservable(observeLocked, false);

    const handleSubmit = useCallback(() => {
        visualizerSettings.provider = selectRef.current!.value as VisualizerProvider;
    }, []);

    return (
        <form className="visualizer-settings-general" method="dialog" onSubmit={handleSubmit}>
            <p>
                <label htmlFor="visualizer-provider">Provider:</label>
                <select
                    id="visualizer-provider"
                    defaultValue={provider}
                    key={provider}
                    ref={selectRef}
                >
                    <option value="none">(none)</option>
                    <option value="">(random)</option>
                    <option value="ambient-video">Ambient Video</option>
                    <option value="ampshader">Ampshader</option>
                    <option value="audiomotion">AudioMotion</option>
                    <option value="milkdrop">Milkdrop</option>
                    <option value="spotify-viz">SpotifyViz</option>
                    <option value="waveform">Waveform</option>
                </select>
            </p>
            <p className="lock-status">
                {locked ? (
                    <small>
                        You need to unlock the current visualizer before changes take effect.
                    </small>
                ) : null}
            </p>
            <footer className="dialog-buttons">
                <button value="#cancel">Cancel</button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
