import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import Preferences from 'types/Preferences';
import preferences from 'services/preferences';
import DialogButtons from 'components/Dialog/DialogButtons';

export default function PlaylistExportSettings() {
    const id = useId();
    const submitted = useRef(false);
    const originalSettings = useMemo(
        () => ({
            askExportBitRate: preferences.askExportBitRate,
            defaultExportBitRate: preferences.defaultExportBitRate,
            exportConcurrency: preferences.exportConcurrency,
            showSimplifiedExportTarget: preferences.showSimplifiedExportTarget,
        }),
        []
    );
    const [askExportBitRate, setAskExportBitRate] = useState(originalSettings.askExportBitRate);

    const handleSubmit = useCallback(() => {
        submitted.current = true;
    }, []);

    useEffect(() => {
        return () => {
            if (!submitted.current) {
                Object.assign(preferences, originalSettings);
            }
        };
    }, [originalSettings]);

    return (
        <form className="playlist-export-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Performance</legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-concurrency`}>Parallel tracks:</label>
                        <input
                            type="number"
                            id={`${id}-concurrency`}
                            min={1}
                            max={8}
                            step={1}
                            defaultValue={originalSettings.exportConcurrency}
                            onChange={(e) => {
                                if (e.target.validity.valid) {
                                    preferences.exportConcurrency = e.target.valueAsNumber;
                                }
                            }}
                        />
                    </p>
                </div>
                <p>
                    <small>
                        Number of Jellyfin tracks transcoded and copied at the same time (1–8).
                    </small>
                </p>
            </fieldset>
            <fieldset>
                <legend>MP3 Quality</legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-bit-rate`}>Default bitrate:</label>
                        <select
                            id={`${id}-bit-rate`}
                            defaultValue={originalSettings.defaultExportBitRate}
                            onChange={(e) =>
                                (preferences.defaultExportBitRate = Number(
                                    e.target.value
                                ) as Preferences['defaultExportBitRate'])
                            }
                        >
                            <option value={128}>128 kbps</option>
                            <option value={192}>192 kbps</option>
                            <option value={256}>256 kbps</option>
                            <option value={320}>320 kbps</option>
                        </select>
                    </p>
                </div>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-ask-bit-rate`}
                        defaultChecked={originalSettings.askExportBitRate}
                        onChange={(e) => {
                            preferences.askExportBitRate = e.target.checked;
                            setAskExportBitRate(e.target.checked);
                        }}
                    />
                    <label htmlFor={`${id}-ask-bit-rate`}>
                        Ask for bitrate before each export
                    </label>
                </p>
                {!askExportBitRate ? (
                    <p>
                        <small>Exports will always use the default bitrate.</small>
                    </p>
                ) : null}
            </fieldset>
            <fieldset>
                <legend>Destination</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-simplified-target`}
                        defaultChecked={originalSettings.showSimplifiedExportTarget}
                        onChange={(e) => {
                            preferences.showSimplifiedExportTarget = e.target.checked;
                        }}
                    />
                    <label htmlFor={`${id}-simplified-target`}>
                        Show simplified export target
                    </label>
                </p>
                <p>
                    <small>
                        Show a simple list of removable USB drives instead of the folder picker.
                    </small>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
