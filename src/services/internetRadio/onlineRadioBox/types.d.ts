declare namespace OnlineRadioBox {
    interface Station {
        readonly id: number;
        readonly version: number;
        readonly regionId: number;
        readonly cityId: number;
        readonly cityName: string;
        readonly frequency: string;
        readonly alias: string;
        readonly title: string;
        readonly rank: number;
        readonly listeners: number;
        readonly country: string;
        readonly status: number;
        readonly genres: readonly string[];
        readonly genreIds: readonly number[];
        readonly catIds: readonly number[];
    }

    interface NowPlaying {
        readonly alias: string;
        readonly stationId: number;
        readonly updated: number; // unix
        readonly trackId?: string;
        readonly title?: string;
        readonly citatisId?: number;
        readonly iName?: string;
        readonly iArtist?: string;
        readonly iImg?: string;
    }

    interface SearchResponse {
        readonly timeStamp: number;
        readonly stations: readonly Station[];
        readonly Total: number;
    }

    interface StationResponse {
        readonly timeStamp: number;
        readonly station: Station;
    }
}
