import React, {useCallback, useMemo, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import PublicMediaService from 'types/PublicMediaService';
import {
    getPersonalMediaServices,
    getPublicMediaServices,
    getScrobblers,
    getService,
} from 'services/mediaServices';
import {allowAllServices, isSourceVisible, setHiddenSources} from 'services/servicesSettings';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaServiceList from 'components/Settings/MediaLibrarySettings/MediaServiceList';
import {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import './StartupWizard.scss';

export default function StartupWizard(props: DialogProps) {
    const [pageNumber, setPageNumber] = useState(0);
    const pages = useMemo(
        () => [<StreamingMedia key={0} />, <DataServices key={1} />, <PersonalMedia key={2} />],
        []
    );

    const prev = useCallback(() => {
        setPageNumber((pageNumber) => pageNumber - 1);
    }, []);

    const next = useCallback(() => {
        setPageNumber((pageNumber) => pageNumber + 1);
    }, []);

    return (
        <Dialog {...props} className="settings-dialog startup-wizard" title="Media Services">
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
    const services = useMemo(getPublicMediaServices, []);
    return (
        <Services
            icon="globe"
            title="Streaming Media"
            services={services}
            multiSelect={allowAllServices}
        />
    );
}

function PersonalMedia() {
    const services = useMemo(getPersonalMediaServices, []);
    return (
        <Services icon="network" title="Personal Media Servers" services={services} />
    );
}

function DataServices() {
    const services = useMemo(getScrobblers, []);
    return <Services icon="data" title="Listening History" services={services} multiSelect />;
}

interface ServicesProps {
    icon: IconName;
    title: string;
    services: readonly MediaService[];
    multiSelect?: boolean;
}

function Services({icon, title, multiSelect, services}: ServicesProps) {
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
        <div className="startup-wizard-services">
            <h3>
                <MediaSourceLabel icon={icon} text={title} />
            </h3>
            <fieldset className="media-services" onChange={handleChange} ref={ref}>
                <legend>Enable</legend>
                <MediaServiceList services={services} multiSelect={multiSelect} />
            </fieldset>
            {restrictedAccess ? (
                <p className="restricted-access">*Access is restricted.</p>
            ) : null}
        </div>
    );
}

function hasRestrictedAccess(service: MediaService | undefined): boolean {
    return !!(service as PublicMediaService)?.restrictedAccess;
}
