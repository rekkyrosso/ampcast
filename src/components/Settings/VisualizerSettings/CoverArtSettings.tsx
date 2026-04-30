import React, {useId} from 'react';
import {t} from 'services/i18n';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function CoverArtSettings() {
    const id = useId();

    return (
        <fieldset className="cover-art-settings">
            <legend>Options</legend>
            <p>
                <input
                    id={`${id}-beats-overlay`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.coverArtBeats}
                    onChange={(e) => (visualizerSettings.coverArtBeats = e.target.checked)}
                />
                <label htmlFor={`${id}-beats-overlay`}>Show &quot;beats&quot; overlay</label>
            </p>
            <p>
                <input
                    id={`${id}-animated-background`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.coverArtAnimatedBackground}
                    onChange={(e) =>
                        (visualizerSettings.coverArtAnimatedBackground = e.target.checked)
                    }
                />
                <label htmlFor={`${id}-animated-background`}>Animated background</label>
            </p>
            <p>
                <input
                    id={`${id}-lyrics`}
                    type="checkbox"
                    defaultChecked={visualizerSettings.coverArtLyrics}
                    onChange={(e) => (visualizerSettings.coverArtLyrics = e.target.checked)}
                />
                <label htmlFor={`${id}-lyrics`}>
                    {t('Show synchronized lyrics (where available)')}
                </label>
            </p>
        </fieldset>
    );
}
