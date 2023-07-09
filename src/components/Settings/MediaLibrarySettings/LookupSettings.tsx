import React, {useId} from 'react';
import lookupSettings from 'services/lookup/lookupSettings';
import {getLookupServices} from 'services/mediaServices';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface LookupSettingsProps {
    lookupRef: React.RefObject<HTMLSelectElement>;
    onSubmit: () => void;
}

export default function LookupSettings({lookupRef, onSubmit}: LookupSettingsProps) {
    const id = useId();
    const preferredService = lookupSettings.preferredService;

    return (
        <form className="lookup-settings" method="dialog" onSubmit={onSubmit}>
            <label htmlFor={`${id}-lookup-services`}>Preferred Service:</label>
            <select id={`${id}-lookup-services`} defaultValue={preferredService} ref={lookupRef}>
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
            <DialogButtons />
        </form>
    );
}
