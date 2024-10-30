import React, {useId} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function ButterchurnSettings() {
    const id = useId();

    return (
        <fieldset className="butterchurn-settings">
            <legend>Options</legend>
            <p>
                <input
                    id={`${id}-transparency`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.butterchurnTransparency}
                    onChange={(e) =>
                        (visualizerSettings.butterchurnTransparency = e.target.checked)
                    }
                />
                <label htmlFor={`${id}-transparency`}>Use transparency for light themes</label>
            </p>
        </fieldset>
    );
}
