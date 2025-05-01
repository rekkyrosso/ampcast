type CountryCode = 'au' | 'ca' | 'ch' | 'fr' | 'gb' | 'ie' | 'pl' | 'us';

export default interface RadioStation {
    readonly id: string;
    readonly name: string;
    readonly api: string; // Url for `NowPlaying` data
    readonly stream: string; // Playable stream url
    readonly country: CountryCode | '';
    readonly location: string; // Descriptive string
}
