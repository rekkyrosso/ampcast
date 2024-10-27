import React, {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import TabList, {TabItem} from 'components/TabList';
import MediaInfo, {MediaInfoProps} from './MediaInfo';
import MediaDetails from './MediaDetails';
import './MediaInfoTabs.scss';

export default function MediaInfoTabs<T extends MediaObject>(props: MediaInfoProps<T>) {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaInfo {...props} />,
            },
            {
                tab: 'Details',
                panel: <MediaDetails {...props} />,
            },
        ],
        [props]
    );
    return <TabList className="media-info-tabs" items={tabs} label="Media Info" />;
}
