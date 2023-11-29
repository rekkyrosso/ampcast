declare const __app_name__: string;
declare const __app_version__: string;
declare const __app_contact__: string;
declare const __dev__: boolean;
declare const __electron__: boolean;

declare const __am_dev_token__: string;
declare const __lf_api_key__: string;
declare const __lf_api_secret__: string;
declare const __sp_client_id__: string;
declare const __yt_api_key__: string;
declare const __yt_client_id__: string;

declare module '*.frag' {
    const value: string;
    export = value;
}

declare module 'string-score' {
    export default 'string-score' as (target: string, query: string, fuzziness?: number) => number;
}

declare module 'shaka-player/dist/shaka-player.compiled' {
    export = shaka;
}

declare module 'jsfft' {
    interface ComplexArray {
        real: Float32Array;
        imag: Float32Array;
    }

    function InvFFT(input: Float32Array): ComplexArray;
}

type HTMLInputElements = {
    [Symbol.iterator](): Iterator<HTMLInputElement>;
};
