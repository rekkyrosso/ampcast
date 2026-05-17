import React, {useEffect, useReducer, useState} from 'react';
import Listen from 'types/Listen';
import MediaService from 'types/MediaService';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import {observeScrobbleSettingsChange} from 'services/scrobbleSettings';
import PageHeader from 'components/MediaBrowser/PageHeader';
import PagedItems from 'components/MediaBrowser/PagedItems';
import MediaSourceSelector from 'components/MediaBrowser/MediaSourceSelector';
import useSource from 'hooks/useSource';
import useScrobbleSources from './useScrobbleSources';
import './UnscrobbledBrowser.scss';

export interface UnscrobbledBrowserProps {
    service: MediaService;
    source: MediaMultiSource<Listen>;
}

export default function UnscrobbledBrowser({service, source}: UnscrobbledBrowserProps) {
    const [, forceUpdate] = useReducer((i) => i + 1, 0);
    const sources = useScrobbleSources(source);

    useEffect(() => {
        const subscription = observeScrobbleSettingsChange().subscribe(forceUpdate);
        return () => subscription.unsubscribe();
    }, [forceUpdate]);

    return (
        <>
            <PageHeader icon={service.icon}>{service.name}: Unscrobbled</PageHeader>
            {sources.length === 0 ? (
                <NoScrobblers />
            ) : (
                <UnscrobbledItems service={service} sources={sources} />
            )}
        </>
    );
}

interface UnscrobbledItemsProps {
    service: MediaService;
    sources: readonly MediaSource<Listen>[];
}

function UnscrobbledItems({service, sources}: UnscrobbledItemsProps) {
    const [selectedSource, setSelectedSource] = useState<MediaSource>(sources[0]);
    const pager = useSource(selectedSource);

    return (
        <>
            <MediaSourceSelector
                hidden={sources.length <= 1}
                sources={sources}
                onSourceChange={setSelectedSource}
            />
            <PagedItems service={service} source={selectedSource} pager={pager} />
        </>
    );
}

function NoScrobblers() {
    return (
        <div className="panel">
            <div className="page">
                <div className="note" style={{textAlign: 'center'}}>
                    <p>No scrobblers enabled.</p>
                </div>
            </div>
        </div>
    );
}
