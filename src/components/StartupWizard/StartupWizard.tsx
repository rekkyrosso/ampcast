import React, {useCallback, useMemo, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {getBrowsableServices, getScrobblers, getService} from 'services/mediaServices';
import {
    allowMultiSelect,
    isSourceVisible,
    setHiddenSources,
} from 'services/mediaServices/servicesSettings';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaServiceList from 'components/Settings/MediaLibrarySettings/MediaServiceList';
import {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import useMediaServices from 'hooks/useMediaServices';
import './StartupWizard.scss';

export default function StartupWizard(props: DialogProps) {
    const services = useMediaServices();
    const [pageNumber, setPageNumber] = useState(0);
    const pages = useMemo(() => {
        return services.length === 0
            ? []
            : [<StreamingMedia key={0} />, <DataServices key={1} />, <PersonalMedia key={2} />];
    }, [services]);

    const prev = useCallback(() => {
        setPageNumber((pageNumber) => pageNumber - 1);
    }, []);

    const next = useCallback(() => {
        setPageNumber((pageNumber) => pageNumber + 1);
    }, []);

    return (
        <Dialog
            {...props}
            className="settings-dialog startup-wizard"
            icon="settings"
            title="Select Services"
        >
            <form method="dialog">
                {pages[pageNumber]}
                <footer className="dialog-buttons">
                    <button type="button" disabled={pageNumber === 0} onClick={prev}>
                        « Prev
                    </button>
                    <button type="button" disabled={pageNumber >= pages.length - 1} onClick={next}>
                        Next »
                    </button>
                    <button className="dialog-button-submit">Finish</button>
                </footer>
            </form>
        </Dialog>
    );
}

function StreamingMedia() {
    return (
        <Services
            icon="globe"
            title="Streaming Media"
            services={getBrowsableServices(ServiceType.PublicMedia)}
            multiSelect={allowMultiSelect}
        />
    );
}

function PersonalMedia() {
    return (
        <Services
            className="personal-media-services"
            icon="network"
            title="Personal Media Server"
            services={getBrowsableServices(ServiceType.PersonalMedia)}
        />
    );
}

function DataServices() {
    return (
        <Services icon="data" title="Listening History" services={getScrobblers()} multiSelect />
    );
}

interface ServicesProps {
    icon: IconName;
    title: string;
    services: readonly MediaService[];
    className?: string;
    multiSelect?: boolean;
}

function Services({icon, title, className, multiSelect, services}: ServicesProps) {
    const ref = useRef<HTMLFieldSetElement>(null);
    const [restrictedAccess, setRestrictedAccess] = useState(() =>
        services.filter(isSourceVisible).some(hasRestrictedAccess)
    );

    const handleChange = useCallback(async () => {
        const inputs = ref.current!.elements as HTMLInputElements;
        const updates: Record<string, boolean> = {};
        let restrictedAccess = false;
        for (const input of inputs) {
            const serviceId = input.value;
            if (serviceId) {
                const disabled = !input.checked;
                updates[serviceId] = disabled;
                if (!disabled) {
                    restrictedAccess ||= hasRestrictedAccess(getService(serviceId));
                }
            }
        }
        setHiddenSources(updates);
        setRestrictedAccess(restrictedAccess);
    }, []);

    return (
        <div className={className}>
            <h3>
                <MediaSourceLabel icon={icon} text={title} />
            </h3>
            <fieldset className="media-services" onChange={handleChange} ref={ref}>
                <legend>Enable</legend>
                <MediaServiceList services={services} multiSelect={multiSelect} />
            </fieldset>
            {restrictedAccess ? <p className="restricted-access">*Access is restricted.</p> : null}
        </div>
    );
}

function hasRestrictedAccess(service: MediaService | undefined): boolean {
    return !!(service as PublicMediaService)?.restrictedAccess;
}
