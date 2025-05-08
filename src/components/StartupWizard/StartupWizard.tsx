import React, {useCallback, useMemo, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {getBrowsableServices, getService} from 'services/mediaServices';
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
        const pages: any[] = [];
        if (services.length === 0) {
            pages.push(
                <div className="note">
                    <p>No services configured.</p>
                </div>
            );
        } else {
            const publicMediaServices = getBrowsableServices(ServiceType.PublicMedia);
            if (publicMediaServices.length > 0) {
                pages.push(<StreamingMedia services={publicMediaServices} key={0} />);
            }
            const personalMediaServices = getBrowsableServices(ServiceType.PersonalMedia);
            if (personalMediaServices.length > 0) {
                pages.push(<PersonalMedia services={personalMediaServices} key={1} />);
            }
            const dataServices = getBrowsableServices(ServiceType.DataService);
            if (dataServices.length > 0) {
                pages.push(<DataServices services={dataServices} key={2} />);
            }
        }
        return pages;
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
                    {pages.length > 1 ? (
                        <>
                            <button type="button" disabled={pageNumber === 0} onClick={prev}>
                                « Prev
                            </button>
                            <button
                                type="button"
                                disabled={pageNumber >= pages.length - 1}
                                onClick={next}
                            >
                                Next »
                            </button>
                            <button className="dialog-button-submit">Finish</button>
                        </>
                    ) : (
                        <button className="dialog-button-submit">OK</button>
                    )}
                </footer>
            </form>
        </Dialog>
    );
}

function StreamingMedia({services}: Pick<ServicesProps, 'services'>) {
    return (
        <Services
            icon="globe"
            title="Streaming Media"
            services={services}
            multiSelect={allowMultiSelect}
        />
    );
}

function PersonalMedia({services}: Pick<ServicesProps, 'services'>) {
    return (
        <Services
            className="personal-media-services"
            icon="network"
            title="Personal Media Server"
            services={services}
        />
    );
}

function DataServices({services}: Pick<ServicesProps, 'services'>) {
    return <Services icon="data" title="Listening History" services={services} multiSelect />;
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
