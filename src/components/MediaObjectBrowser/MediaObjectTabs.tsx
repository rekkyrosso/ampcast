import React, {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import ErrorBox from 'components/Errors/ErrorBox';
import MediaDetails from 'components/MediaInfo/MediaDetails';
import MediaInfo from 'components/MediaInfo';
import TabList, {TabItem} from 'components/TabList';

export interface MediaObjectTabsProps<T extends MediaObject> {
    item: T | undefined;
    children?: React.ReactNode;
    error?: unknown;
}

export default function MediaObjectTabs<T extends MediaObject>({
    item,
    children,
    error,
}: MediaObjectTabsProps<T>) {
    const tabs: TabItem[] = useMemo(() => {
        const errorBox = error ? <ErrorBox error={error} reportedBy="MediaObjectBrowser" /> : null;
        return [
            {
                tab: 'Media',
                panel: errorBox || children,
                prefix: 'media',
            },
            {
                tab: 'Related',
                panel: errorBox || <p>Related</p>,
                prefix: 'related',
            },
            {
                tab: 'Info',
                panel: errorBox || (item ? <MediaInfo item={item} /> : <div />),
                prefix: 'info',
            },
            {
                tab: 'Details',
                panel: errorBox || (item ? <MediaDetails item={item} /> : <div />),
                prefix: 'details',
            },
        ];
    }, [item, children, error]);

    return (
        <TabList
            className="media-object-tabs"
            items={tabs}
            label={error ? 'Error' : item?.title || ''}
        />
    );
}
