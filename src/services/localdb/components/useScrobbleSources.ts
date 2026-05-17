import {useEffect, useState} from 'react';
import Listen from 'types/Listen';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import {ScrobblerId} from 'types/MediaServiceId';
import {isServiceVisible, observeVisibilityChanges} from 'services/mediaServices/servicesSettings';

export default function useScrobbleSources(
    multiSource: MediaMultiSource<Listen>
): readonly MediaSource<Listen>[] {
    const [sources, setSources] = useState<readonly MediaSource<Listen>[]>(() =>
        getVisibleSources(multiSource)
    );

    useEffect(() => {
        const subscription = observeVisibilityChanges().subscribe(() =>
            setSources(getVisibleSources(multiSource))
        );
        return () => subscription.unsubscribe();
    }, [multiSource]);

    return sources;
}

function getVisibleSources(multiSource: MediaMultiSource<Listen>): readonly MediaSource<Listen>[] {
    return multiSource.sources.filter((source) => {
        const [, scrobblerId] = source.id.split('/');
        return isServiceVisible(scrobblerId as ScrobblerId);
    });
}
