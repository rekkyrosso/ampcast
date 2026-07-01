import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import spotifyAudioAnalyser from './spotifyAudioAnalyser';
import spotifyPlayer from './spotifyPlayer';
import spotifyRadioPlayer from './spotifyRadioPlayer';

spotifyAudioAnalyser.player = spotifyPlayer;

mediaPlayer.addPlayers([spotifyPlayer, spotifyRadioPlayer]);
