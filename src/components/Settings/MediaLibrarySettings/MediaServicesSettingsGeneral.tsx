import React, {useCallback, useRef} from 'react';
import MediaService from 'types/MediaService';
import ServiceType from 'types/ServiceType';
import {getService} from 'services/mediaServices';
import {allowMultiSelect, setHiddenSources} from 'services/mediaServices/servicesSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import MediaServiceList from './MediaServiceList';
import confirmDisconnectServices from './confirmDisconnectServices';

export interface MediaServicesSettingsGeneralProps {
    serviceType: ServiceType;
    services: readonly MediaService[];
}

export default function MediaServicesSettingsGeneral({
    serviceType,
    services,
}: MediaServicesSettingsGeneralProps) {
    const ref = useRef<HTMLFieldSetElement>(null);
    const isPublicMedia = serviceType === ServiceType.PublicMedia;
    const multiSelect = !isPublicMedia || allowMultiSelect;

    const handleSubmit = useCallback(async () => {
        const inputs = ref.current!.elements as HTMLInputElements;
        const updates: Record<string, boolean> = {};
        const disabledServices = [];
        for (const input of inputs) {
            const serviceId = input.value;
            if (serviceId) {
                const disabled = !input.checked;
                updates[serviceId] = disabled;
                const service = getService(serviceId);
                if (service && !service.noAuth && disabled) {
                    disabledServices.push(service);
                }
            }
        }
        const confirmed = await confirmDisconnectServices(disabledServices);
        if (confirmed) {
            setHiddenSources(updates);
        }
    }, []);

    return (
        <form method="dialog" onSubmit={handleSubmit}>
            <fieldset className="media-services" ref={ref}>
                <legend>Enable</legend>
                {services.length === 0 ? (
                    <div className="note">
                        <p>No services configured.</p>
                    </div>
                ) : (
                    <MediaServiceList services={services} multiSelect={multiSelect} />
                )}
            </fieldset>
            <DialogButtons />
        </form>
    );
}
