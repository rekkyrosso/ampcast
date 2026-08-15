import React, {useEffect, useState} from 'react';
import {map, merge, of, skipWhile, switchMap, take} from 'rxjs';
import Browsable from 'types/Browsable';
import MediaService from 'types/MediaService';
import {srcToPath} from 'utils';
import {getBrowsableServices, observeMediaServices} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import {isSourceVisible, observeVisibilityChanges} from 'services/mediaServices/servicesSettings';
import {TreeNode} from 'components/TreeView';
import MediaServiceLabel from './MediaServiceLabel';
import MediaSourceLabel from './MediaSourceLabel';

export default function useMediaSources() {
    const [sources, setSources] = useState<TreeNode<string>[]>();

    useEffect(() => {
        const refresh$ = merge(observeVisibilityChanges(), pinStore.observePins());
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

function getServices(): TreeNode<string>[] {
    return getBrowsableServices()
        .filter(isSourceVisible)
        .map((service) => getService(service));
}

function getService(service: Browsable<MediaService>): TreeNode<string> {
    return {
        id: service.id,
        label: <MediaServiceLabel service={service} showConnectivity />,
        value: service.id,
        startExpanded: true,
        children: [...getSources(service), ...getPins(service)],
    };
}

function getSources(service: Browsable<MediaService>): TreeNode<string>[] {
    return (
        service.sources?.filter(isSourceVisible).map((source) => ({
            id: source.id,
            label: <MediaSourceLabel icon={source.icon} text={source.title} />,
            value: source.id,
        })) || []
    );
}

function getPins(service: Browsable<MediaService>): TreeNode<string>[] {
    if (service.createSourceFromPin) {
        return pinStore.getPinsForService(service.id).map((pin) => {
            return {
                id: pin.src,
                label: (
                    <MediaSourceLabel
                        className={pin.isPinned ? '' : 'unpinned'}
                        icon="pin"
                        text={pin.title}
                    />
                ),
                value: `pins/${srcToPath(pin.src)}`,
            };
        });
    } else {
        return [];
    }
}
