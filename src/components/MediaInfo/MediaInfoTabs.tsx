import React, {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import TabList, {TabItem} from 'components/TabList';
import MediaInfo, {MediaInfoProps} from './MediaInfo';
import MediaDetails from './MediaDetails';
import './MediaInfoTabs.scss';

export default function MediaInfoTabs<T extends MediaObject>({item}: MediaInfoProps<T>) {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaInfo item={item} />,
            },
            {
                tab: 'Details',
                panel: <MediaDetails item={item} />,
            },
        ],
        [item]
    );
    return <TabList className="media-info-tabs" items={tabs} label="Media info" />;
}
