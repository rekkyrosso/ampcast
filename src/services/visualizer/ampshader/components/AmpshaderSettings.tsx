import React, {useId} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function AmpshaderSettings() {
    const id = useId();

    return (
        <fieldset className="ampshader-settings">
            <legend>Options</legend>
            <p>
                <input
                    id={`${id}-transparency`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.ampshaderTransparency}
                    onChange={(e) => (visualizerSettings.ampshaderTransparency = e.target.checked)}
                />
                <label htmlFor={`${id}-transparency`}>Use transparency for light themes</label>
            </p>
        </fieldset>
    );
}
