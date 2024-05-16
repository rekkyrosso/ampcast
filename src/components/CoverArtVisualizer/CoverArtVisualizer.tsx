import React, {useEffect, useRef, useState} from 'react';
import {distinctUntilChanged, map} from 'rxjs';
import Color from 'colorjs.io';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import audio from 'services/audio';
import {observeVisualizerSettings} from 'services/visualizer';
import coverart from 'services/visualizer/coverart';
import CovertArtPlayer from 'services/visualizer/coverart/CovertArtPlayer';
import useLoadingState from 'components/Media/useLoadingState';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useFontSize from 'hooks/useFontSize';
import useObservable from 'hooks/useObservable';
import useOnResize from 'hooks/useOnResize';
import usePrevious from 'hooks/usePrevious';
import CurrentlyPlaying from './CurrentlyPlaying';
import {filterNotEmpty} from 'utils';
import './CoverArtVisualizer.scss';

const observeAnimatedBackgroundEnabled = () =>
    observeVisualizerSettings().pipe(
        map((settings) => settings.coverArtAnimatedBackground),
        distinctUntilChanged()
    );

export default function CoverArtVisualizer() {
    const ref = useRef<HTMLDivElement>(null);
    const animatedBackgroundEnabled = useObservable(observeAnimatedBackgroundEnabled, false);
    const [player, setPlayer] = useState<CovertArtPlayer | null>(null);
    const [arrange, setArrange] = useState<'row' | 'column'>('row');
    const [palette, setPalette] = useState<readonly string[]>(['#000000']);
    const backgroundColor = palette[0];
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [thumbnailSize, setThumbnailSize] = useState(0);
    const fontSize = useFontSize(ref);
    const currentlyPlaying = useCurrentlyPlaying();
    const item = currentlyPlaying?.mediaType === MediaType.Video ? null : currentlyPlaying;
    const prevItem = usePrevious(item);
    const id = item?.id || '';
    const indexRef = useRef(-1);
    const [item0, setItem0] = useState<PlaylistItem | null>(null);
    const [item1, setItem1] = useState<PlaylistItem | null>(null);
    const loadingState = useLoadingState();
    const [ready, setReady] = useState(false);
    const isItem0 = item0?.id === id;
    const isItem1 = item1?.id === id;

    useEffect(() => {
        if (loadingState === 'error') {
            setReady(true);
        } else {
            setReady(false);
            if (loadingState === 'loaded') {
                const timerId = setTimeout(() => setReady(true), 4500);
                return () => clearTimeout(timerId);
            }
        }
    }, [loadingState]);

    useEffect(() => {
        const subscription = audio.observeReady().subscribe((audio) => {
            const player = coverart.createPlayer(audio) as CovertArtPlayer;
            player.appendTo(ref.current!);
            setPlayer(player);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (width > height) {
            const maxHeight = height - 5 * fontSize;
            setThumbnailSize(Math.min(Math.floor(width * 0.45), maxHeight));
            setArrange('row');
        } else {
            const maxWidth = width - 3 * fontSize;
            setThumbnailSize(Math.min(Math.floor(height * 0.45), maxWidth));
            setArrange('column');
        }
    }, [width, height, fontSize]);

    useOnResize(ref, ({width, height}) => {
        setWidth(width);
        setHeight(height);
    });

    useEffect(() => {
        let selectedIndex = indexRef.current ? 1 : 0;
        if (item?.id !== prevItem?.id) {
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
            const [backgroundColor, textColor] = palette
                .slice(0, 2)
                .map((color) => new Color(color));
            let [, , ...colors] = palette;
            colors = filterNotEmpty(colors, (color: any) => {
                color = new Color(color);
                return backgroundColor.deltaE2000(color) > 10;
            });
            colors = filterNotEmpty(colors, (color: any) => {
                color = new Color(color);
                return textColor.deltaE2000(color) > 10;
            });
            player.backgroundColor = backgroundColor.toString({format: 'hex'});
            player.beatsColor = colors[0];
        }
    }, [player, palette]);

    return (
        <div
            className={`visualizer visualizer-coverart arrange-${arrange} ${ready ? 'ready' : ''} ${
                animatedBackgroundEnabled ? 'animated-background-enabled' : ''
            }`}
            style={
                {
                    '--thumbnail-size': `${thumbnailSize}px`,
                } as React.CSSProperties
            }
            ref={ref}
        >
            <div
                className="animated-background"
                style={
                    {
                        '--background-color': backgroundColor,
                    } as React.CSSProperties
                }
            />
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
