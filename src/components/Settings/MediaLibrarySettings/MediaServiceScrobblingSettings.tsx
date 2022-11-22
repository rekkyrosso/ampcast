import React, {useCallback, useId, useMemo, useRef} from 'react';
import mediaServices from 'services/mediaServices';
import {
    ScrobblingOptions,
    canScrobble,
    canUpdateNowPlaying,
    setNoScrobble,
    updateOptions,
} from 'services/scrobbleSettings';
import Input from 'components/Input';
import Button from 'components/Button';
import {MediaServiceSettingsProps} from './MediaServiceSettings';

export default function MediaServiceScrobblingSettings({
    service: scrobbler,
}: MediaServiceSettingsProps) {
    const id = useId();
    const scrobbleRef = useRef<HTMLFieldSetElement>(null);
    const optionsRef = useRef<HTMLFieldSetElement>(null);
    const services = useMemo(() => mediaServices.all.filter((service) => !service.scrobbler), []);

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
        <form
            className={`media-library-settings ${scrobbler.id}-settings scrobble-settings`}
            method="dialog"
            onSubmit={handleSubmit}
        >
            <fieldset ref={scrobbleRef}>
                <legend>Scrobble</legend>
                <ul>
                    {services.map((service) => (
                        <li key={service.id}>
                            <Input
                                id={`${id}-${service.id}`}
                                type="checkbox"
                                value={service.id}
                                defaultChecked={canScrobble(scrobbler, service)}
                            />
                            <label htmlFor={`${id}-${service.id}`}>{service.title}</label>
                        </li>
                    ))}
                </ul>
            </fieldset>
            <fieldset ref={optionsRef}>
                <legend>Options</legend>
                <ul>
                    <li>
                        <Input
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
            <footer className="dialog-buttons">
                <Button value="#cancel">Cancel</Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
