import React, {useCallback, useRef} from 'react';
import VisualizerProvider from 'types/VisualizerProvider';
import {observeProvider, setProvider} from 'services/visualizer';
import Button from 'components/Button';
import useObservable from 'hooks/useObservable';

export default function VisualizerGeneralSettings() {
    const selectRef = useRef<HTMLSelectElement>(null);
    const provider = useObservable(observeProvider, '');

    const handleSubmit = useCallback(() => {
        setProvider(selectRef.current!.value as VisualizerProvider);
    }, []);

    return (
        <form className="visualizer-general-settings" method="dialog" onSubmit={handleSubmit}>
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
            <footer className="dialog-buttons">
                <Button value="#cancel">Cancel</Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
