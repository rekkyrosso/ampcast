import React, {useMemo} from 'react';
import ServiceType from 'types/ServiceType';
import {getBrowsableServices, getDataServices} from 'services/mediaServices';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import {TreeNode} from 'components/TreeView';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import AppSettings from './AppSettings';
import AppearanceSettings from './AppearanceSettings';
import MediaServicesSettings from './MediaLibrarySettings/MediaServicesSettings';
import MediaServiceSettings from './MediaLibrarySettings/MediaServiceSettings';
import VisualizerSettings from './VisualizerSettings';
import AdvancedSettings from './AdvancedSettings';

export default function useSettingsSources(): readonly TreeNode<React.ReactNode>[] {
    const sources = useMemo(() => {
        const publicMediaServices = getBrowsableServices(ServiceType.PublicMedia);
        const personalMediaServices = getBrowsableServices(ServiceType.PersonalMedia);
        const dataServices = getDataServices();

        return [
            {
                id: 'app',
                label: <MediaSourceLabel text="Application" icon="ampcast" />,
                value: <AppSettings />,
            },
            {
                id: 'streaming-media',
                label: <MediaSourceLabel text="Streaming Media" icon="globe" />,
                value: (
                    <MediaServicesSettings
                        title="Streaming Media Settings"
                        serviceType={ServiceType.PublicMedia}
                        services={publicMediaServices}
                        key={ServiceType.PublicMedia}
                    />
                ),
                startExpanded: true,
                children: publicMediaServices.filter(isSourceVisible).map((service) => ({
                    id: service.id,
                    label: <MediaServiceLabel service={service} />,
                    value: <MediaServiceSettings service={service} key={service.id} />,
                })),
            },
            {
                id: 'personal-media',
                label: <MediaSourceLabel text="Personal Media" icon="network" />,
                value: (
                    <MediaServicesSettings
                        title="Personal Media Settings"
                        serviceType={ServiceType.PersonalMedia}
                        services={personalMediaServices}
                        key={ServiceType.PersonalMedia}
                    />
                ),
                startExpanded: true,
                children: personalMediaServices.filter(isSourceVisible).map((service) => ({
                    id: service.id,
                    label: <MediaServiceLabel service={service} />,
                    value: <MediaServiceSettings service={service} key={service.id} />,
                })),
            },
            {
                id: 'data-services',
                label: <MediaSourceLabel text="Data Services" icon="data" />,
                value: (
                    <MediaServicesSettings
                        title="Data Services Settings"
                        serviceType={ServiceType.DataService}
                        services={dataServices}
                        key={ServiceType.DataService}
                    />
                ),
                startExpanded: true,
                children: dataServices.filter(isSourceVisible).map((service) => ({
                    id: service.id,
                    label: <MediaServiceLabel service={service} />,
                    value: <MediaServiceSettings service={service} key={service.id} />,
                })),
            },
            {
                id: 'visualizer',
                label: <MediaSourceLabel text="Visualizer" icon="visualizer" />,
                value: <VisualizerSettings />,
            },
            {
                id: 'appearance',
                label: <MediaSourceLabel text="Appearance" icon="palette" />,
                value: <AppearanceSettings />,
            },
            {
                id: 'advanced',
                label: <MediaSourceLabel text="Advanced" icon="settings" />,
                value: <AdvancedSettings />,
            },
        ];
    }, []);

    return sources;
}
