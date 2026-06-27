import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import plexRadioPlayer from './plexRadioPlayer';

mediaPlayer.registerPlayer(plexRadioPlayer, (item) =>
    /^plex:(artist-)?radio:/.test(item?.src || '')
);
