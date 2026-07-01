import RadioPlayer from 'services/mediaPlayback/players/RadioPlayer';
import spotifyPlayer from './spotifyPlayer';

const spotifyRadioPlayer = new RadioPlayer('spotify', spotifyPlayer, (item) =>
    item.src.startsWith('spotify:artist-radio:')
);

export default spotifyRadioPlayer;
