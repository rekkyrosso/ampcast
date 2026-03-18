declare namespace RadioBrowserInfo {
    interface Station {
        readonly changeuuid: string;
        readonly stationuuid: string;
        readonly serveruuid: string | null;
        readonly name: string;
        readonly url: string;
        readonly url_resolved: string;
        readonly homepage: string;
        readonly favicon: string;
        readonly tags: string;
        readonly country: string;
        readonly countrycode: string;
        readonly iso_3166_2: string;
        readonly state: string;
        readonly language: string;
        readonly languagecodes: string;
        readonly votes: number;
        readonly lastchangetime: string;
        readonly lastchangetime_iso8601: string;
        readonly codec: string;
        readonly bitrate: number;
        readonly hls: 0 | 1;
        readonly lastcheckok: 0 | 1;
        readonly lastchecktime: string;
        readonly lastchecktime_iso8601: string;
        readonly lastcheckoktime: string;
        readonly lastcheckoktime_iso8601: string;
        readonly lastlocalchecktime: string;
        readonly lastlocalchecktime_iso8601: string;
        readonly clicktimestamp: string;
        readonly clicktimestamp_iso8601: string | null;
        readonly clickcount: number;
        readonly clicktrend: number;
        readonly ssl_error: number;
        readonly geo_lat: number;
        readonly geo_long: number;
        readonly geo_distance: number | null;
        readonly has_extended_info: boolean;
    }

    interface Country {
        readonly iso_3166_1: string;
        readonly name: string;
        readonly stationcount: number;
    }

    interface Tag {
        readonly name: string;
        readonly stationcount: number;
    }
}
