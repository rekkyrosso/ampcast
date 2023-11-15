import React, {useMemo} from 'react';
import ServiceType from 'types/ServiceType';
import {
    getPersonalMediaServices,
    getPublicMediaServices,
    getDataServices,
} from 'services/mediaServices';
import {isSourceVisible} from 'services/servicesSettings';
import {TreeNode} from 'components/TreeView';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import AppearanceSettings from './AppearanceSettings';
import MediaServicesSettings from './MediaLibrarySettings/MediaServicesSettings';
import MediaServiceSettings from './MediaLibrarySettings/MediaServiceSettings';
import PlaylistSettings from './PlaylistSettings';
import VisualizerSettings from './VisualizerSettings';
import AdvancedSettings from './AdvancedSettings';

export default function useSettingsSources(): readonly TreeNode<React.ReactNode>[] {
    const sources = useMemo(
        () => [
            {
                id: 'streaming-media',
                label: <MediaSourceLabel text="Streaming Media" icon="globe" />,
                value: (
                    <MediaServicesSettings
                        title="Streaming Media Settings"
                        serviceType={ServiceType.PublicMedia}
                        services={getPublicMediaServices()}
                        key={ServiceType.PublicMedia}
                    />
                ),
                startExpanded: true,
                children: getPublicMediaServices()
                    .filter(isSourceVisible)
                    .map((service) => ({
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
                        services={getPersonalMediaServices()}
                        key={ServiceType.PersonalMedia}
                    />
                ),
                startExpanded: true,
                children: getPersonalMediaServices()
                    .filter(isSourceVisible)
                    .map((service) => ({
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
                        services={getDataServices()}
                        key={ServiceType.DataService}
                    />
                ),
                startExpanded: true,
                children: getDataServices()
                    .filter(isSourceVisible)
                    .map((service) => ({
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
                id: 'playlist',
                label: <MediaSourceLabel text="Playlist" icon="playlist" />,
                value: <PlaylistSettings />,
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
        ],
        []
    );

    return sources;
}
