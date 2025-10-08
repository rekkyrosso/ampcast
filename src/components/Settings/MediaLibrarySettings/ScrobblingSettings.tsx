import React, {useCallback, useId, useMemo, useRef} from 'react';
import DataService from 'types/DataService';
import {getPlayableServices} from 'services/mediaServices';
import {
    ScrobblingOptions,
    canScrobble,
    canUpdateNowPlaying,
    getScrobbledAt,
    setNoScrobble,
    updateOptions,
} from 'services/scrobbleSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface ScrobblingSettingsProps {
    service: DataService;
}

export default function ScrobblingSettings({service: scrobbler}: ScrobblingSettingsProps) {
    const id = useId();
    const scrobbleRef = useRef<HTMLFieldSetElement>(null);
    const updateNowPlayingRef = useRef<HTMLInputElement>(null);
    const scrobbledAtRef = useRef<HTMLSelectElement>(null);
    const services = useMemo(getPlayableServices, []);

    const handleSubmit = useCallback(() => {
        const scrobbleInputs = scrobbleRef.current!.elements as HTMLInputElements;
        const scrobbleSettings: Record<string, boolean> = {};
        for (const input of scrobbleInputs) {
            scrobbleSettings[input.value] = !input.checked;
        }
        setNoScrobble(scrobbler.id, scrobbleSettings);

        const scrobblingOptions: Partial<ScrobblingOptions> = {};
        scrobblingOptions.updateNowPlaying = updateNowPlayingRef.current!.checked;
        scrobblingOptions.scrobbledAt = scrobbledAtRef.current!
            .value as ScrobblingOptions['scrobbledAt'];
        updateOptions(scrobbler, scrobblingOptions);
    }, [scrobbler]);

    return (
        <form className="scrobbling-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset ref={scrobbleRef}>
                <legend>Scrobble</legend>
                <ul className="checkbox-list">
                    {services.map((service) => (
                        <li key={service.id}>
                            <input
                                id={`${id}-${service.id}`}
                                type="checkbox"
                                value={service.id}
                                defaultChecked={canScrobble(scrobbler.id, service)}
                                disabled={service.id === 'youtube'}
                            />
                            <label htmlFor={`${id}-${service.id}`}>{service.name}</label>
                        </li>
                    ))}
                </ul>
            </fieldset>
            <fieldset className="scrobbling-options">
                <legend>Options</legend>
                <p>
                    <label htmlFor={`${id}-scrobbled-at`}>Scrobble time:</label>
                    <select
                        id={`${id}-scrobbling-options`}
                        defaultValue={getScrobbledAt(scrobbler.id)}
                        ref={scrobbledAtRef}
                    >
                        <option value="playedAt">Start time</option>
                        <option value="endedAt">End time</option>
                    </select>
                </p>
                <p>
                    <input
                        id={`${id}-update-now-playing`}
                        type="checkbox"
                        value="updateNowPlaying"
                        defaultChecked={canUpdateNowPlaying(scrobbler.id)}
                        ref={updateNowPlayingRef}
                    />
                    <label htmlFor={`${id}-update-now-playing`}>
                        Update &quot;Now Playing&quot;
                    </label>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
