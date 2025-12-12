import React, {useEffect, useRef, useState} from 'react';
import Color from 'colorjs.io';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import type CovertArtPlayer from '../CovertArtPlayer';
import {filterNotEmpty} from 'utils';
import audio from 'services/audio';
import visualizerSettings, {
    observeVisualizerSettings,
} from 'services/visualizer/visualizerSettings';
import useFontSize from 'hooks/useFontSize';
import useObservable from 'hooks/useObservable';
import useOnResize from 'hooks/useOnResize';
import usePrevious from 'hooks/usePrevious';
import coverart from '../coverart';
import CurrentlyPlaying from './CurrentlyPlaying';
import useCoverArtItems from './useCoverArtItems';
import './CoverArtVisualizer.scss';

export default function CoverArtVisualizer() {
    const ref = useRef<HTMLDivElement>(null);
    const {coverArtAnimatedBackground, coverArtBeats} = useObservable(
        observeVisualizerSettings,
        visualizerSettings
    );
    const [player, setPlayer] = useState<CovertArtPlayer | null>(null);
    const [arrange, setArrange] = useState<'row' | 'column'>('row');
    const [palette, setPalette] = useState<readonly string[]>(['#000000', '#ffffff']);
    const backgroundColor = palette[0];
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [thumbnailSize, setThumbnailSize] = useState(0);
    const fontSize = useFontSize(ref);
    const {current: currentTrack, next: nextTrack} = useCoverArtItems();
    const item = currentTrack?.mediaType === MediaType.Video ? null : currentTrack;
    const prevItem = usePrevious(item);
    const nextItem = nextTrack?.mediaType === MediaType.Video ? null : nextTrack;
    const currentId = item?.id || '';
    const indexRef = useRef(0);
    const [item0, setItem0] = useState<PlaylistItem | null>(null);
    const [item1, setItem1] = useState<PlaylistItem | null>(null);
    const isItem0 = item0?.id === currentId;
    const isItem1 = !isItem0;
    const [paletteReady, setPaletteReady] = useState(false);
    const paletteKey = String(palette);

    useEffect(() => {
        setPaletteReady(false);
        const timerId = setTimeout(() => setPaletteReady(true), 4500);
        return () => clearTimeout(timerId);
    }, [paletteKey]);

    useEffect(() => {
        const player = coverart.createPlayer(audio) as CovertArtPlayer;
        player.appendTo(ref.current!);
        setPlayer(player);
    }, []);

    useEffect(() => {
        if (width > height) {
            const maxHeight = height - (coverArtBeats ? 6 : 3) * fontSize;
            setThumbnailSize(Math.min(Math.floor(width * 0.45), maxHeight));
            setArrange('row');
        } else {
            const maxWidth = width - 3 * fontSize;
            setThumbnailSize(Math.min(Math.floor(height * 0.45), maxWidth));
            setArrange('column');
        }
    }, [width, height, fontSize, coverArtBeats]);

    useOnResize(ref, ({width, height}) => {
        setWidth(width);
        setHeight(height);
    });

    useEffect(() => {
        let selectedIndex = indexRef.current ? 1 : 0;
        if (prevItem !== undefined && item?.id !== prevItem?.id) {
            selectedIndex = indexRef.current ? 0 : 1;
        }
        if (selectedIndex === 0) {
            setItem0(item);
        } else {
            setItem1(item);
        }
        indexRef.current = selectedIndex;
    }, [item, prevItem]);

    useEffect(() => {
        if (player) {
            const HEX = {format: 'hex'};
            const [backgroundColor, textColor] = palette
                .slice(0, 2)
                .map((color) => new Color(color));
            player.backgroundColor = backgroundColor.toString(HEX);
            const [, , ...rest] = palette;
            if (rest.length === 0) {
                player.beatsColor = textColor.toString(HEX);
                player.color = backgroundColor.toString(HEX);
            } else {
                let colors = rest.map((color) => new Color(color));
                colors = filterNotEmpty(colors, (color) => backgroundColor.deltaE2000(color) > 20);
                colors = filterNotEmpty(colors, (color) => textColor.deltaE2000(color) > 10);
                let playerColors = filterNotEmpty(
                    colors,
                    (color) => backgroundColor.contrast(color, 'Lstar') < 20
                );
                playerColors = filterNotEmpty(colors, (color) => color.to('hsl').s > 20);
                const playerColor = playerColors.toSorted(
                    (a, b) =>
                        backgroundColor.contrast(a, 'Lstar') - backgroundColor.contrast(b, 'Lstar')
                )[0];
                const beatsPlayerColors = filterNotEmpty(
                    colors,
                    (color) => playerColor.deltaE2000(color) > 10
                );
                player.beatsColor = (
                    beatsPlayerColors[0] === playerColor
                        ? beatsPlayerColors[1] || textColor
                        : beatsPlayerColors[0]
                ).toString(HEX);
                player.color = playerColor.toString(HEX);
            }
        }
    }, [player, palette]);

    return (
        <div
            className={`visualizer visualizer-coverart arrange-${arrange} ${
                coverArtAnimatedBackground ? 'animated-background-enabled' : ''
            } ${paletteReady ? 'palette-ready' : ''}`}
            style={
                {
                    '--background-color': backgroundColor,
                    '--thumbnail-size': `${thumbnailSize}px`,
                } as React.CSSProperties
            }
            ref={ref}
        >
            {/* Preload next item thumbnail */}
            <CurrentlyPlaying
                item={nextItem}
                hidden={true}
                extendedThumbnailSearch
                key="nextItem"
            />
            <div className="animated-background" />
            <CurrentlyPlaying
                item={item0}
                hidden={!isItem0}
                onPaletteChange={isItem0 ? setPalette : undefined}
                key="item0"
            />
            <CurrentlyPlaying
                item={item1}
                hidden={!isItem1}
                onPaletteChange={isItem1 ? setPalette : undefined}
                key="item1"
            />
            <div className="beats-player" />
        </div>
    );
}
