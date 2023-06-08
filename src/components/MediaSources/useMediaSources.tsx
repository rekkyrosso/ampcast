import React, {useEffect, useState} from 'react';
import {map, merge} from 'rxjs';
import {getAllServices} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import plexSettings from 'services/plex/plexSettings';
import {isVisible, observeHiddenServiceChanges} from 'services/servicesSettings';
import {MediaSourceIconName} from 'components/Icon';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import MediaSourceLabel from './MediaSourceLabel';
import {exists} from 'utils';

export default function useMediaSources(): TreeNode<React.ReactNode>[] {
    const [sources, setSources] = useState<TreeNode<React.ReactNode>[]>([]);

    useEffect(() => {
        const subscription = merge(
            observeHiddenServiceChanges(),
            pinStore.observe(),
            plexSettings.observeLibraryId()
        )
            .pipe(
                map(() => {
                    return getAllServices()
                        .filter(isVisible)
                        .map((service) => ({
                            id: service.id,
                            label: (
                                <MediaSourceLabel
                                    icon={service.icon as MediaSourceIconName}
                                    text={service.name}
                                    showConnectivity
                                />
                            ),
                            value: <MediaBrowser service={service} sources={service.roots} />,
                            startExpanded: true,

                            children: service.sources
                                .filter(isVisible)
                                .map((source) => ({
                                    id: source.id,
                                    label: (
                                        <MediaSourceLabel icon={source.icon} text={source.title} />
                                    ),
                                    value: <MediaBrowser service={service} sources={[source]} />,
                                }))
                                .concat(
                                    pinStore
                                        .getPinsForService(service.id)
                                        .map((pin) => service.createSourceFromPin?.(pin))
                                        .filter(exists)
                                        .map((source) => ({
                                            id: source.id,
                                            label: (
                                                <MediaSourceLabel
                                                    icon={source.icon}
                                                    text={source.title}
                                                />
                                            ),
                                            value: (
                                                <MediaBrowser
                                                    service={service}
                                                    sources={[source]}
                                                />
                                            ),
                                        }))
                                ),
                        }));
                })
            )
            .subscribe(setSources);
        return () => subscription.unsubscribe();
    }, []);

    return sources;
}
