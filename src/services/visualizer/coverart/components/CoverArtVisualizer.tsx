import React, {useEffect, useMemo, useRef, useState} from 'react';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import type CovertArtController from '../CovertArtController';
import audio from 'services/audio';
import {Thumbnail} from 'components/MediaInfo';
import usePrevious from 'hooks/usePrevious';
import coverart from '../coverart';
import CurrentlyPlaying from './CurrentlyPlaying';
import useCoverArtItems from './useCoverArtItems';
import './CoverArtVisualizer.scss';

export default function CoverArtVisualizer() {
    const ref = useRef<HTMLDivElement>(null);
    const player = useMemo(() => coverart.createPlayer(audio) as CovertArtController, []);
    const {current: currentTrack, next: nextTrack} = useCoverArtItems();
    const item = currentTrack?.mediaType === MediaType.Video ? null : currentTrack;
    const nextItem = nextTrack?.mediaType === MediaType.Video ? null : nextTrack;
    const [currentIndex, setCurrentIndex] = useState<0 | 1 | -1>(-1);
    const [item0, setItem0] = useState<PlaylistItem | null>(null);
    const [item1, setItem1] = useState<PlaylistItem | null>(null);
    const isItem0 = currentIndex === 0;
    const isItem1 = currentIndex === 1;
    const currentId = item?.id || '';
    const prevId = usePrevious(currentId);
    const changed = (prevId !== undefined && currentId !== prevId) || currentIndex === -1;

    useEffect(() => {
        if (currentIndex !== -1) {
            player.currentIndex = currentIndex;
        }
    }, [player, currentIndex]);

    useEffect(() => {
        player.appendTo(ref.current!);
    }, [player]);

    useEffect(() => {
        if (changed) {
            if (currentIndex === 0) {
                setItem1(item);
                setCurrentIndex(1);
            } else {
                setItem0(item);
                setCurrentIndex(0);
            }
        }
    }, [item, changed, currentIndex]);

    return (
        <div className="visualizer visualizer-coverart" ref={ref}>
            <CurrentlyPlaying item={item0} player={player?.player0} hidden={!isItem0} key="item0" />
            <CurrentlyPlaying item={item1} player={player?.player1} hidden={!isItem1} key="item1" />
            {/* Preload next item thumbnail */}
            {nextItem ? (
                <div hidden>
                    <Thumbnail item={nextItem} size={800} extendedSearch />
                </div>
            ) : null}
        </div>
    );
}
