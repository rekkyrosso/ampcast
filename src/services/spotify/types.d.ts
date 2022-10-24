declare namespace SpotifyWebApi {
    interface SpotifyWebApiJs {
        getAudioAnalysisForTrack(trackId: string): Promise<SpotifyApi.AudioAnalysisObject>;
    }
}
