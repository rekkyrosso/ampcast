import React, {useEffect, useId, useState} from 'react';
import MediaService from 'types/MediaService';
import {getAllServices} from 'services/mediaServices';
import {isSourceVisible} from 'services/servicesSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import {partition} from 'utils';
import './MediaLibrarySettingsGeneral.scss';

export interface MediaLibrarySettingsGeneralProps {
    servicesRef: React.RefObject<HTMLFormElement>;
    onSubmit: () => void;
}

export default function MediaLibrarySettingsGeneral({
    servicesRef,
    onSubmit,
}: MediaLibrarySettingsGeneralProps) {
    const [mediaServices, scrobblers] = useMediaServices();

    return (
        <form
            className="media-library-settings-general"
            method="dialog"
            onSubmit={onSubmit}
            ref={servicesRef}
        >
            <fieldset>
                <legend>Media Services</legend>
                <CheckboxList services={mediaServices} />
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
    services: MediaService[];
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
                        <MediaSourceLabel icon={service.icon} text={service.name} />
                    </label>
                </li>
            ))}
        </ul>
    );
}

function useMediaServices() {
    const [services, setServices] = useState<[MediaService[], MediaService[]]>([[], []]);

    useEffect(() => {
        setServices(partition(getAllServices(), (service) => !service.isScrobbler));
    }, []);

    return services;
}
