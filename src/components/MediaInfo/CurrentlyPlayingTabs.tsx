import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaDetails from './MediaDetails';
import CurrentlyPlaying, {CurrentlyPlayingProps} from './CurrentlyPlaying';

export default function CurrentlyPlayingTabs({item, visualizer}: CurrentlyPlayingProps) {
    const tabs: TabItem[] = useMemo(() => {
        const tabs = [
            {
                tab: 'Now Playing',
                panel: <CurrentlyPlaying item={item} visualizer={visualizer} />,
            },
        ];
        if (item) {
            tabs.push({
                tab: 'Details',
                panel: <MediaDetails item={item} />,
            });
        }
        return tabs;
    }, [item, visualizer]);
    return <TabList className="media-info-tabs" items={tabs} label="Media Info" />;
}
