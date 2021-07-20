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
                    <option value="">(random)</option>
                    <option value="video">Ambient Video</option>
                    <option value="audiomotion">AudioMotion Visualizer</option>
                    <option value="milkdrop">Milkdrop Visualizer</option>
                    <option value="waveform">Waveform Visualizer</option>
                    <option value="ampshade">Ampshade Visualizer</option>
                </select>
            </p>
            <footer className="dialog-buttons">
                <Button value="#cancel">Cancel</Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
