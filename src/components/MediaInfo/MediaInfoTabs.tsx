import React, {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import TabList, {TabItem} from 'components/TabList';
import MediaInfo, {MediaInfoProps} from './MediaInfo';
import MediaDetails from './MediaDetails';
import './MediaInfoTabs.scss';

export default function MediaInfoTabs<T extends MediaObject>({
    item,
    scrobblingOptions,
}: MediaInfoProps<T>) {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaInfo item={item} scrobblingOptions={scrobblingOptions} />,
            },
            {
                tab: 'Details',
                panel: <MediaDetails item={item} />,
            },
        ],
        [item, scrobblingOptions]
    );
    return <TabList className="media-info-tabs" items={tabs} label="Media info" />;
}
