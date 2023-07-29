import React, {useId, useMemo} from 'react';
import MediaService from 'types/MediaService';
import {
    getPersonalMediaServices,
    getPublicMediaServices,
    getScrobblers,
} from 'services/mediaServices';
import {isSourceVisible} from 'services/servicesSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import './MediaLibrarySettingsGeneral.scss';

export interface MediaLibrarySettingsGeneralProps {
    servicesRef: React.RefObject<HTMLFormElement>;
    onSubmit: () => void;
}

export default function MediaLibrarySettingsGeneral({
    servicesRef,
    onSubmit,
}: MediaLibrarySettingsGeneralProps) {
    const [publicServices, personalServices, scrobblers] = useMemo(() => {
        return [getPublicMediaServices(), getPersonalMediaServices(), getScrobblers()];
    }, []);

    return (
        <form
            className="media-library-settings-general"
            method="dialog"
            onSubmit={onSubmit}
            ref={servicesRef}
        >
            <fieldset>
                <legend>Media Services</legend>
                <CheckboxList services={publicServices} />
            </fieldset>
            <fieldset>
                <legend>Personal Media</legend>
                <CheckboxList services={personalServices} />
            </fieldset>
            <fieldset>
                <legend>Listening History</legend>
                <CheckboxList services={scrobblers} />
            </fieldset>
            <DialogButtons />
        </form>
    );
}

interface CheckboxListProps {
    services: readonly MediaService[];
}

function CheckboxList({services}: CheckboxListProps) {
    const id = useId();
    return (
        <ul className="checkbox-list">
            {services.map((service) => (
                <li key={service.id}>
                    <input
                        id={`${id}-${service.id}`}
                        type="checkbox"
                        value={service.id}
                        defaultChecked={isSourceVisible(service)}
                    />
                    <label htmlFor={`${id}-${service.id}`}>
                        <MediaServiceLabel service={service} />
                    </label>
                </li>
            ))}
        </ul>
    );
}
