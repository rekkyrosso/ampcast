import React, {useCallback, useId, useRef} from 'react';
import lookupSettings from 'services/lookup/lookupSettings';
import {getLookupServices} from 'services/mediaServices';

export default function LookupSettings() {
    const id = useId();
    const ref = useRef<HTMLSelectElement>(null);
    const preferredService = lookupSettings.preferredService;

    const handleSubmit = useCallback(() => {
        lookupSettings.preferredService = ref.current!.value;
    }, []);

    return (
        <form className="lookup-settings" method="dialog" onSubmit={handleSubmit}>
            <label htmlFor={`${id}-lookup-services`}>Preferred Service:</label>
            <select id={`${id}-lookup-services`} defaultValue={preferredService} ref={ref}>
                <option value="">(none)</option>
                {getLookupServices().map((service) => (
                    <option value={service.id} key={service.id}>
                        {service.name}
                    </option>
                ))}
            </select>
            <div className="note">
                <p>
                    To enable playback from last.fm and ListenBrainz, Ampcast will search your
                    logged in services to find a match.
                </p>
                <p>
                    Exact matches are preferred. If you have several exact matches then the match
                    from the preferred lookup service is used.
                </p>
            </div>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
