import React, {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaDetails from 'components/MediaInfo/MediaDetails';
import MediaInfo from 'components/MediaInfo';
import TabList, {TabItem} from 'components/TabList';

export interface MediaObjectTabsProps<T extends MediaObject> {
    item: T;
    children?: React.ReactNode;
}

export default function MediaObjectTabs<T extends MediaObject>({
    item,
    children,
}: MediaObjectTabsProps<T>) {
    const tabs: TabItem[] = useMemo(() => {
        return [
            {
                tab: 'Media',
                panel: children,
                prefix: 'media',
            },
            {
                tab: 'Related',
                panel: <p>Related</p>,
                prefix: 'related',
            },
            {
                tab: 'Info',
                panel: <MediaInfo item={item} />,
                prefix: 'info',
            },
            {
                tab: 'Details',
                panel: <MediaDetails item={item} />,
                prefix: 'details',
            },
        ];
    }, [item, children]);

    return <TabList className="media-object-tabs" items={tabs} label={item.title} />;
}
