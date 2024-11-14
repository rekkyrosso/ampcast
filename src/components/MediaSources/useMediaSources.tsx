import React, {useEffect, useState} from 'react';
import {map, merge, of, skipWhile, switchMap, take} from 'rxjs';
import MediaService from 'types/MediaService';
import {
    getEnabledServices,
    isPersonalMediaService,
    observeMediaServices,
    observePersonalMediaLibraryIdChanges,
} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import {isSourceVisible, observeVisibilityChanges} from 'services/mediaServices/servicesSettings';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import MediaServiceLabel from './MediaServiceLabel';
import MediaSourceLabel from './MediaSourceLabel';

export default function useMediaSources() {
    const [sources, setSources] = useState<TreeNode<React.ReactNode>[]>();

    useEffect(() => {
        const refresh$ = merge(
            observeVisibilityChanges(),
            observePersonalMediaLibraryIdChanges(),
            pinStore.observePins()
        );
        const subscription = observeMediaServices()
            .pipe(
                skipWhile((services) => services.length === 0),
                switchMap((services) =>
                    services.length === 0
                        ? of([])
                        : pinStore.observePins().pipe(
                              take(1),
                              switchMap(() => refresh$),
                              map(() => getServices())
                          )
                )
            )
            .subscribe(setSources);
        return () => subscription.unsubscribe();
    }, []);

    return sources;
}

function getServices(): TreeNode<React.ReactNode>[] {
    return getEnabledServices()
        .filter(isSourceVisible)
        .map((service) => getService(service));
}

function getService(service: MediaService): TreeNode<React.ReactNode> {
    return {
        id: service.id,
        label: <MediaServiceLabel service={service} showConnectivity />,
        tooltip: service.name,
        value: (
            <MediaBrowser service={service} source={service.root} key={getServiceKey(service)} />
        ),
        startExpanded: true,
        children: [...getSources(service), ...getPins(service)],
    };
}

function getSources(service: MediaService): TreeNode<React.ReactNode>[] {
    return service.sources.filter(isSourceVisible).map((source) => ({
        id: source.id,
        label: <MediaSourceLabel icon={source.icon} text={source.title} />,
        tooltip: `${service.name}: ${source.title}`,
        value: (
            <MediaBrowser
                service={service}
                source={source}
                key={`${getServiceKey(service)}/${source.id}`}
            />
        ),
    }));
}

function getPins(service: MediaService): TreeNode<React.ReactNode>[] {
    if (service.createSourceFromPin) {
        return pinStore.getPinsForService(service.id).map((pin) => {
            const source = service.createSourceFromPin!(pin);
            return {
                id: source.id,
                label: (
                    <MediaSourceLabel
                        className={pin.isPinned ? '' : 'unpinned'}
                        icon={source.icon}
                        text={source.title}
                    />
                ),
                tooltip: `${service.name}: ${source.title}`,
                value: <MediaBrowser service={service} source={source} key={source.id} />,
            };
        });
    } else {
        return [];
    }
}

function getServiceKey(service: MediaService): string {
    return isPersonalMediaService(service)
        ? `${service.id}/${service.libraryId || ''}`
        : service.id;
}
