import ItemType from 'types/ItemType';
import ServiceType from 'types/ServiceType';
import SubsonicService from 'services/subsonic/factory/SubsonicService';

const bandcamp = new SubsonicService({
    id: 'bandcamp',
    name: 'Bandcamp',
    url: 'https://bandcamp.com',
    listingName: 'Bandcamp (Subsonic API)',
});

bandcamp.api.proxy = '/bandcamp/api';

// Subject to improvements in Bandcamp's OpenSubsonic implementation.
const allowedSources = [
    'bandcamp/recently-added',
    'bandcamp/playlists',
    'bandcamp/tracks-by-genre',
    'bandcamp/albums-by-genre',
    'bandcamp/random-albums',
];

Object.assign(bandcamp as any, {
    serviceType: ServiceType.PublicMedia,
    loginHelpUrl: 'https://bandcamp.com/settings?pane=fan#subsonic',
    // Subject to improvements in Bandcamp's OpenSubsonic implementation.
    disableRadios: true,
    disableTopTracks: true,
    canRate: () => false,
    canStore: () => false,
    sources: bandcamp.sources?.filter((source) => allowedSources.includes(source.id)),
    // Currently only adding/deleting single items is allowed.
    addToPlaylist: undefined,
    createPlaylist: undefined, // Not currently working anyway
    editablePlaylists: undefined,
});

// Subject to improvements in Bandcamp's OpenSubsonic implementation.
const getGenres = bandcamp.api.getGenres.bind(bandcamp.api);
bandcamp.api.getGenres = async (itemType: ItemType) => {
    // Remove `count` param. It's currently meaningless.
    const genres = await getGenres(itemType);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return genres.map(({count, ...genre}) => genre);
};

export default bandcamp;
