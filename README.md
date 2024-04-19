# Ampcast

A music player inspired by Winamp.

## Features

* Supports Plex, Jellyfin, Emby, Navidrome and Subsonic
* Additional support for Apple Music, TIDAL (via Plex), YouTube and Spotify
* Built-in visualizers: Milkdrop (Butterchurn) and others
* Scrobbling for last.fm and ListenBrainz

## Web app / PWA

Available at https://ampcast.app.

## Downloadable app

Windows, Mac and Linux builds available.

Download from https://github.com/rekkyrosso/ampcast/releases.

## Self-hosting

Requires Node >= 20.

```bash
git clone https://github.com/rekkyrosso/ampcast.git

cd ./ampcast

# install deps
npm i

# build the web view
npm run build:dev

# start the web server
npm run start:dev
```

Navigate to http://localhost:8000 to run the app.

You can optionally create a `.env` file ([example](https://github.com/rekkyrosso/ampcast/blob/main/.env.example)) to store API keys and other config options.

## Contributing

I request that you only [open an issue](https://github.com/rekkyrosso/ampcast/issues) for submitting **bug reports**.

Please use the [**Discussions**](https://github.com/rekkyrosso/ampcast/discussions) section on GitHub to send **feature requests**, questions, suggestions or any other feedback.

There is also a [general discussion forum on reddit](https://www.reddit.com/r/ampcast).

## License

[GNU General Public License v3.0 ©](https://github.com/rekkyrosso/ampcast/blob/main/LICENSE)
