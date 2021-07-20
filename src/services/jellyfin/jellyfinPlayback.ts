import MediaItem from 'types/MediaItem';
import jellyfinApi from './jellyfinApi';

console.log('module::jellyfinPlayback');

export async function reportStart(item: MediaItem): Promise<void> {
    const [, , ItemId] = item.src.split(':');
    await jellyfinApi.post('Sessions/Playing', {
        ItemId,
        IsPaused: false,
        PositionTicks: 0,
        PlayMethod: 'Transcode',
    });
}

export async function reportStop(item: MediaItem, currentTime: number): Promise<void> {
    const [, , ItemId] = item.src.split(':');
    await jellyfinApi.post('Sessions/Playing/Stopped', {
        ItemId,
        IsPaused: false,
        PositionTicks: Math.floor(currentTime * 10_000_000),
        PlayMethod: 'Transcode',
    });
}

export async function reportProgress(
    item: MediaItem,
    currentTime: number,
    paused: boolean,
    eventName: 'pause' | 'unpause' | 'timeupdate'
): Promise<void> {
    const [, , ItemId] = item.src.split(':');
    await jellyfinApi.post('Sessions/Playing/Progress', {
        ItemId,
        IsPaused: paused,
        PositionTicks: Math.floor(currentTime * 10_000_000),
        PlayMethod: 'Transcode',
        EventName: eventName,
    });
}

const jellyfinPlayback = {
    reportStart,
    reportStop,
    reportProgress,
};

export default jellyfinPlayback;
