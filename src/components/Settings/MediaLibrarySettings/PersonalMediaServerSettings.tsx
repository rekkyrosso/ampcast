import React, {useCallback, useId, useRef} from 'react';
import PersonalMediaService from 'types/PersonalMediaService';
import DialogButtons from 'components/Dialog/DialogButtons';
import ExternalLink from 'components/ExternalLink';
import useAudioLibraries from './useAudioLibraries';
import './PersonalMediaServerSettings.scss';

export interface PersonalMediaServerSettingsProps {
    service: PersonalMediaService;
}

export default function PersonalMediaServerSettings({service}: PersonalMediaServerSettingsProps) {
    const id = useId();
    const ref = useRef<HTMLSelectElement>(null);
    const preferredLibraryId = service.libraryId;
    const libraries = useAudioLibraries(service);

    const handleSubmit = useCallback(() => {
        service.libraryId = ref.current!.value;
    }, [service]);

    return (
        <form className="personal-media-server-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Host</legend>
                {service.host ? <ExternalLink href={service.host} /> : 'Not configured'}
            </fieldset>
            <fieldset>
                <legend>Preferences</legend>
                <p>
                    <label htmlFor={`${id}-libraries`}>Library:</label>
                    <select id={`${id}-libraries`} defaultValue={preferredLibraryId} ref={ref}>
                        {libraries.map(({id, title}) => (
                            <option value={id} key={id}>
                                {title}
                            </option>
                        ))}
                    </select>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
