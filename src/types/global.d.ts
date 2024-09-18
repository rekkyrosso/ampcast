declare const __app_name__: string;
declare const __app_version__: string;
declare const __app_contact__: string;
declare const __dev__: boolean;

declare const __am_dev_token__: string;
declare const __lf_api_key__: string;
declare const __lf_api_secret__: string;
declare const __sp_client_id__: string;
declare const __td_client_id__: string;
declare const __yt_client_id__: string;

declare const __spotify_disabled__: boolean;
declare const __tidal_disabled__: boolean;
declare const __youtube_disabled__: boolean;
declare const __single_streaming_service__: boolean;

declare module '*.frag' {
    const value: string;
    export = value;
}

declare module 'colorthief' {
    export type RGBColor = [number, number, number];
    export default class ColorThief {
        getColor: (img: HTMLImageElement | null, quality: number = 10) => RGBColor;
        getPalette: (
            img: HTMLImageElement | null,
            colorCount: number = 10,
            quality: number = 10
        ) => RGBColor[] | null;
    }
}

declare module 'string-score' {
    export default 'string-score' as (target: string, query: string, fuzziness?: number) => number;
}

declare module 'shaka-player/dist/shaka-player.compiled' {
    export = shaka;
}

declare type TidalMusicPlayer = typeof import('@tidal-music/player');

declare module 'jsfft' {
    interface ComplexArray {
        real: Float32Array;
        imag: Float32Array;
    }

    function FFT(input: Float32Array): ComplexArray;
    function InvFFT(input: Float32Array): ComplexArray;
}

type HTMLInputElements = {
    [Symbol.iterator](): Iterator<HTMLInputElement>;
};

type Subtract<T, V> = Pick<T, Exclude<keyof T, keyof V>>;
