import React, {useCallback, useId, useMemo, useRef} from 'react';
import {getAllServices} from 'services/mediaServices';
import {
    ScrobblingOptions,
    canScrobble,
    canUpdateNowPlaying,
    setNoScrobble,
    updateOptions,
} from 'services/scrobbleSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import {MediaServiceSettingsProps} from './MediaServiceSettings';

export default function ScrobblingSettings({service: scrobbler}: MediaServiceSettingsProps) {
    const id = useId();
    const scrobbleRef = useRef<HTMLFieldSetElement>(null);
    const optionsRef = useRef<HTMLFieldSetElement>(null);
    const services = useMemo(() => getAllServices().filter((service) => !service.isScrobbler), []);

    const handleSubmit = useCallback(() => {
        const scrobbleInputs = scrobbleRef.current!.elements as HTMLInputElements;
        const scrobbleSettings: Record<string, boolean> = {};
        for (const input of scrobbleInputs) {
            scrobbleSettings[input.value] = !input.checked;
        }
        setNoScrobble(scrobbler, scrobbleSettings);

        const optionsInputs = optionsRef.current!.elements as HTMLInputElements;
        const optionsSettings: Partial<ScrobblingOptions> = {};
        for (const input of optionsInputs) {
            optionsSettings[input.value as keyof ScrobblingOptions] = input.checked;
        }
        updateOptions(scrobbler, optionsSettings);
    }, [scrobbler]);

    return (
        <form className="scrobbling-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset ref={scrobbleRef}>
                <legend>Scrobble</legend>
                <ul>
                    {services.map((service) => (
                        <li key={service.id}>
                            <input
                                id={`${id}-${service.id}`}
                                type="checkbox"
                                value={service.id}
                                defaultChecked={canScrobble(scrobbler, service)}
                                disabled={service.id === 'youtube'}
                            />
                            <label htmlFor={`${id}-${service.id}`}>{service.name}</label>
                        </li>
                    ))}
                </ul>
            </fieldset>
            <fieldset ref={optionsRef}>
                <legend>Options</legend>
                <ul>
                    <li>
                        <input
                            id={`${id}-scrobbling-options`}
                            type="checkbox"
                            value="updateNowPlaying"
                            defaultChecked={canUpdateNowPlaying(scrobbler)}
                        />
                        <label htmlFor={`${id}-scrobbling-options`}>
                            Update &quot;Now Playing&quot;
                        </label>
                    </li>
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
