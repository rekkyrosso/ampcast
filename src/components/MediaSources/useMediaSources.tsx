import React, {useEffect, useState} from 'react';
import {map, merge, switchMap} from 'rxjs';
import MediaService from 'types/MediaService';
import {getAllServices} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import jellyfinSettings from 'services/jellyfin/jellyfinSettings';
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
        const refresh$ = merge(
            observeHiddenServiceChanges(),
            pinStore.observe(),
            jellyfinSettings.observeLibraryId(),
            plexSettings.observeLibraryId()
        );
        const subscription = pinStore
            .observe()
            .pipe(
                switchMap(() => refresh$),
                map(() => getServices())
            )
            .subscribe(setSources);
        return () => subscription.unsubscribe();
    }, []);

    return sources;
}

function getServices() {
    return getAllServices()
        .filter(isVisible)
        .map((service) => getService(service));
}

function getService(service: MediaService) {
    return {
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

        children: getSources(service),
    };
}

function getSources(service: MediaService) {
    return service.sources
        .filter(isVisible)
        .map((source) => ({
            id: source.id,
            label: <MediaSourceLabel icon={source.icon} text={source.title} />,
            value: <MediaBrowser service={service} sources={[source]} />,
        }))
        .concat(getPins(service));
}

function getPins(service: MediaService) {
    return pinStore
        .getPinsForService(service.id)
        .map((pin) => service.createSourceFromPin?.(pin))
        .filter(exists)
        .map((source) => ({
            id: source.id,
            label: <MediaSourceLabel icon={source.icon} text={source.title} />,
            value: <MediaBrowser service={service} sources={[source]} />,
        }));
}
