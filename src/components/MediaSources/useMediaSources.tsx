import React, {useMemo} from 'react';
import mediaServices from 'services/mediaServices';
import {observeAll, getAll} from 'services/mediaSources';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import useObservable from 'hooks/useObservable';
import MediaSourceLabel from './MediaSourceLabel';

export default function useMediaSources(): TreeNode<React.ReactNode>[] {
    const initialSources = useMemo(getAll, []);
    const mediaSources = useObservable(observeAll, initialSources);

    return useMemo(() => {
        return mediaServices
            .filter((service) => mediaSources.includes(service.id))
            .map((service) => ({
                id: service.id,
                label: (
                    <MediaSourceLabel icon={service.icon} text={service.title} showConnectivity />
                ),
                value: <MediaBrowser sources={service.searches} service={service} />,
                startExpanded: true,

                children: service.sources
                    .filter((source) => mediaSources.includes(source.id))
                    .map((source) => ({
                        id: source.id,
                        label: <MediaSourceLabel icon={source.icon} text={source.title} />,
                        value: <MediaBrowser sources={[source]} service={service} />,
                    })),
            }));
    }, [mediaSources]);
}
