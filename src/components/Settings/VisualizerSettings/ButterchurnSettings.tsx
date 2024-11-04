import React, {useId} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import useVisualizerSettings from 'hooks/useVisualizerSettings';
import './ButterchurnSettings.scss';

export default function ButterchurnSettings() {
    const id = useId();
    const {butterchurnTransitionDelay} = useVisualizerSettings();

    return (
        <div className="butterchurn-settings">
            <fieldset>
                <legend>Refresh</legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-transition-delay`}>When:</label>
                        <select
                            id={`${id}-transition-delay`}
                            defaultValue={visualizerSettings.butterchurnTransitionDelay}
                            onChange={(e) =>
                                (visualizerSettings.butterchurnTransitionDelay = Number(
                                    e.target.value
                                ))
                            }
                        >
                            <option value="0">Only on track change</option>
                            <option value="30">Every 30 seconds</option>
                            <option value="60">Every 60 seconds</option>
                            <option value="90">Every 90 seconds</option>
                            <option value="120">Every 2 minutes</option>
                            <option value="180">Every 3 minutes</option>
                            <option value="240">Every 4 minutes</option>
                            <option value="300">Every 5 minutes</option>
                        </select>
                    </p>
                    <p>
                        <label htmlFor={`${id}-transition-duration`}>Blend time:</label>
                        <input
                            type="number"
                            id={`${id}-transition-duration`}
                            min={0}
                            max={10}
                            step={0.5}
                            disabled={butterchurnTransitionDelay === 0}
                            defaultValue={visualizerSettings.butterchurnTransitionDuration}
                            onChange={(e) =>
                                (visualizerSettings.butterchurnTransitionDuration = Number(
                                    e.target.value
                                ))
                            }
                        />
                    </p>
                </div>
            </fieldset>
            <fieldset>
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
        </div>
    );
}
