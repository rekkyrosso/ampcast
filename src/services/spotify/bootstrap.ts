import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import OmniAnalyserNode from 'services/audio/OmniAnalyserNode';
import spotifyAudioAnalyser from './spotifyAudioAnalyser';
import spotifyPlayer from './spotifyPlayer';

OmniAnalyserNode.spotifyAudioAnalyser = spotifyAudioAnalyser;
spotifyAudioAnalyser.player = spotifyPlayer;
mediaPlayer.addPlayer(spotifyPlayer, true);
