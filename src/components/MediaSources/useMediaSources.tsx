import React, {useEffect, useState} from 'react';
import {map, merge, switchMap, take} from 'rxjs';
import MediaService from 'types/MediaService';
import {getAllServices, observePersonalMediaLibraryIdChanges} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import {isSourceVisible, observeHiddenSourceChanges} from 'services/servicesSettings';
import {MediaSourceIconName} from 'components/Icon';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import MediaSourceLabel from './MediaSourceLabel';
import {exists} from 'utils';

export default function useMediaSources() {
    const [sources, setSources] = useState<TreeNode<React.ReactNode>[]>();

    useEffect(() => {
        const refresh$ = merge(
            observeHiddenSourceChanges(),
            observePersonalMediaLibraryIdChanges(),
            pinStore.observe()
        );
        const subscription = pinStore
            .observe()
            .pipe(
                take(1),
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
        .filter(isSourceVisible)
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
        .filter(isSourceVisible)
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
