import React, {useCallback, useEffect, useState} from 'react';
import ColorThief, {RGBColor} from 'colorthief';
import {TinyColor, mostReadable} from '@ctrl/tinycolor';
import PlaylistItem from 'types/PlaylistItem';
import {uniq} from 'utils';
import {Artist, Thumbnail, Title} from 'components/MediaInfo/MediaInfo';
import ProvidedBy from 'components/MediaSources/ProvidedBy';
import PlaybackState from 'components/Media/PlaybackState';
import ProgressBar from 'components/Media/ProgressBar';
import useVisualizerSettings from 'hooks/useVisualizerSettings';

const defaultPalette = ['#3e3e3e', '#ebebeb'];

export interface CurrentlyPlayingProps {
    item: PlaylistItem | null;
    hidden?: boolean;
    extendedThumbnailSearch?: boolean;
    onPaletteChange?: (colors: readonly string[]) => void;
}

export default function CurrentlyPlaying({
    item,
    hidden,
    extendedThumbnailSearch,
    onPaletteChange,
}: CurrentlyPlayingProps) {
    const {fullscreenProgress} = useVisualizerSettings();
    const [palette, setPalette] = useState<string[]>(defaultPalette);
    const [tone, setTone] = useState<'light' | 'dark'>('dark');
    const [textTone, setTextTone] = useState<'light' | 'dark'>('light');
    const [style, setStyle] = useState<React.CSSProperties>({});

    const handleThumbnailLoad = useCallback((src: string) => {
        const colorThief = new ColorThief();
        const img = new Image();
        const onerror = () => setPalette(defaultPalette);
        const onload = (img: HTMLImageElement) => {
            try {
                const toRGB = (color: RGBColor) => `rgb(${color.map(Number)})`;
                const toColor = (color: RGBColor) => new TinyColor(toRGB(color)).toHexString();
                const backgroundColor = toColor(colorThief.getColor(img));
                const isDark = new TinyColor(backgroundColor).isDark();
                const palette = colorThief.getPalette(img)?.map(toColor) || defaultPalette;
                const textColor =
                    mostReadable(backgroundColor, palette, {
                        includeFallbackColors: true,
                        level: 'AA',
                        size: 'large',
                    })?.toHexString() || (isDark ? '#ffffff' : '#000000');
                setPalette(uniq([backgroundColor, textColor, ...palette]));
            } catch {
                onerror();
            }
        };
        img.crossOrigin = 'anonymous';
        img.src = src;

        if (img.complete) {
            onload(img);
        } else {
            img.onload = () => onload(img);
            img.onerror = () => {
                // Try again but break the cache.
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `${src}${src.includes('?') ? '&' : '?'}ampcast=1}`;

                if (img.complete) {
                    onload(img);
                } else {
                    img.onerror = onerror;
                    img.onload = () => onload(img);
                }
            };
        }
    }, []);

    const handleThumbnailError = useCallback(() => {
        setPalette(defaultPalette);
    }, []);

    useEffect(() => {
        const [backgroundColor, textColor] = palette
            .slice(0, 2)
            .map((color) => new TinyColor(color));
        const {h, s, l} = textColor.toHsl();
        setStyle({
            '--background-color': backgroundColor.toHexString(),
            '--text-color-h': `${h}`,
            '--text-color-s': `${Number(s) * 100}%`,
            '--text-color-l': `${Number(l) * 100}%`,
        } as React.CSSProperties);
        setTone(backgroundColor.isDark() ? 'dark' : 'light');
        setTextTone(textColor.getBrightness() < 148 ? 'dark' : 'light');
        onPaletteChange?.(palette);
    }, [palette, onPaletteChange]);

    return (
        <div
            className={`currently-playing themed ${tone} text-${textTone}`}
            hidden={hidden}
            style={style}
        >
            {item ? (
                <>
                    <div className="currently-playing-thumbnail">
                        <Thumbnail
                            item={item}
                            size={800}
                            extendedSearch={!hidden || extendedThumbnailSearch}
                            onLoad={handleThumbnailLoad}
                            onError={handleThumbnailError}
                            key={item.id}
                        />
                        <ProvidedBy item={item} />
                    </div>
                    <div className="currently-playing-text">
                        <Title title={item.title} />
                        <Artist artist={item.artists?.join(', ')} />
                    </div>
                </>
            ) : null}
            <PlaybackState />
            {fullscreenProgress ? <ProgressBar /> : null}
        </div>
    );
}
