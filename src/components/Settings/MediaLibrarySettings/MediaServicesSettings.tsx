import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import ServiceType from 'types/ServiceType';
import TabList, {TabItem} from 'components/TabList';
import LookupSettings from './LookupSettings';
import MediaServicesSettingsGeneral from './MediaServicesSettingsGeneral';

export interface MediaServicesSettingsProps {
    title: string;
    serviceType: ServiceType;
    services: readonly MediaService[];
}

export default function MediaServicesSettings({
    title,
    serviceType,
    services,
}: MediaServicesSettingsProps) {
    const tabs: TabItem[] = useMemo(() => {
        const tabs = [
            {
                tab: 'General',
                panel: (
                    <MediaServicesSettingsGeneral serviceType={serviceType} services={services} />
                ),
            },
        ];
        if (serviceType === ServiceType.DataService) {
            tabs.push({
                tab: 'Lookup',
                panel: <LookupSettings />,
            });
        }
        return tabs;
    }, [serviceType, services]);

    return <TabList className="media-services-settings" items={tabs} label={title} />;
}
