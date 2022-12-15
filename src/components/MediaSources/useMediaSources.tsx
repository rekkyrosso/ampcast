import React, {useEffect, useState} from 'react';
import {map} from 'rxjs/operators';
import {getAllServices} from 'services/mediaServices';
import {isVisible, observeUpdates} from 'services/servicesSettings';
import {MediaSourceIconName} from 'components/Icon';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import MediaSourceLabel from './MediaSourceLabel';

export default function useMediaSources(): TreeNode<React.ReactNode>[] {
    const [sources, setSources] = useState<TreeNode<React.ReactNode>[]>([]);

    useEffect(() => {
        const subscription = observeUpdates()
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
                            value: <MediaBrowser sources={service.roots} service={service} />,
                            startExpanded: true,

                            children: service.sources.filter(isVisible).map((source) => ({
                                id: source.id,
                                label: <MediaSourceLabel icon={source.icon} text={source.title} />,
                                value: <MediaBrowser sources={[source]} service={service} />,
                            })),
                        }));
                })
            )
            .subscribe(setSources);
        return () => subscription.unsubscribe();
    }, []);

    return sources;
}
