import React, {useEffect, useState} from 'react';
import {map, merge, of, skipWhile, switchMap, take} from 'rxjs';
import Browsable from 'types/Browsable';
import MediaService from 'types/MediaService';
import {
    getBrowsableServices,
    isPersonalMediaService,
    observeMediaServices,
    observePersonalMediaLibraryIdChanges,
} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import {isSourceVisible, observeVisibilityChanges} from 'services/mediaServices/servicesSettings';
import MediaBrowser from 'components/MediaBrowser';
import {TreeNode} from 'components/TreeView';
import {MediaSourceView} from './MediaSources';
import MediaServiceLabel from './MediaServiceLabel';
import MediaSourceLabel from './MediaSourceLabel';

export default function useMediaSources() {
    const [sources, setSources] = useState<TreeNode<MediaSourceView>[]>();

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

function getServices(): TreeNode<MediaSourceView>[] {
    return getBrowsableServices()
        .filter(isSourceVisible)
        .map((service) => getService(service));
}

function getService(service: Browsable<MediaService>): TreeNode<MediaSourceView> {
    return {
        id: service.id,
        label: <MediaServiceLabel service={service} showConnectivity />,
        tooltip: service.name,
        value: {
            source: service,
            view: (
                <MediaBrowser
                    service={service}
                    source={service.root}
                    key={getServiceKey(service)}
                />
            ),
        },
        startExpanded: true,
        children: [...getSources(service), ...getPins(service)],
    };
}

function getSources(service: Browsable<MediaService>): TreeNode<MediaSourceView>[] {
    return (
        service.sources?.filter(isSourceVisible).map((source) => ({
            id: source.id,
            label: <MediaSourceLabel icon={source.icon} text={source.title} />,
            tooltip: `${service.name}: ${source.title}`,
            value: {
                source,
                view: (
                    <MediaBrowser
                        service={service}
                        source={source}
                        key={`${getServiceKey(service)}/${source.id}`}
                    />
                ),
            },
        })) || []
    );
}

function getPins(service: Browsable<MediaService>): TreeNode<MediaSourceView>[] {
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
                value: {
                    source,
                    view: <MediaBrowser service={service} source={source} key={source.id} />,
                },
            };
        });
    } else {
        return [];
    }
}

function getServiceKey(service: Browsable<MediaService>): string {
    return isPersonalMediaService(service)
        ? `${service.id}/${service.libraryId || ''}`
        : service.id;
}
