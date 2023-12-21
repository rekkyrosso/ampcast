import React, {useEffect, useState} from 'react';
import {map, merge, switchMap, take} from 'rxjs';
import MediaService from 'types/MediaService';
import {
    getEnabledServices,
    isPersonalMediaService,
    observePersonalMediaLibraryIdChanges,
} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import {isSourceVisible, observeVisibilityChanges} from 'services/servicesSettings';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import MediaServiceLabel from './MediaServiceLabel';
import MediaSourceLabel from './MediaSourceLabel';
import {exists} from 'utils';

export default function useMediaSources() {
    const [sources, setSources] = useState<TreeNode<React.ReactNode>[]>();

    useEffect(() => {
        const refresh$ = merge(
            observeVisibilityChanges(),
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
    return getEnabledServices()
        .filter(isSourceVisible)
        .map((service) => getService(service));
}

function getService(service: MediaService) {
    return {
        id: service.id,
        label: <MediaServiceLabel service={service} showConnectivity />,
        value: (
            <MediaBrowser service={service} sources={service.roots} key={getServiceKey(service)} />
        ),
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
            value: (
                <MediaBrowser
                    service={service}
                    sources={[source]}
                    key={`${getServiceKey(service)}/${source.id}`}
                />
            ),
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
            value: <MediaBrowser service={service} sources={[source]} key={source.id} />,
        }));
}

function getServiceKey(service: MediaService): string {
    return isPersonalMediaService(service)
        ? `${service.id}/${service.libraryId || ''}`
        : service.id;
}
