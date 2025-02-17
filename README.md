# Ampcast

A music player inspired by Winamp.

## Features

* Supports Plex, Jellyfin, Emby, Navidrome and Subsonic (and variants)
* Additional support for Apple Music, Spotify and YouTube
* Built-in visualizers: Milkdrop (Butterchurn) and others
* Scrobbling for last.fm and ListenBrainz
* Playback from last.fm/ListenBrainz (via search of logged in services)

## Web app / PWA

Available at https://ampcast.app

## Desktop app

Windows, Mac and Linux builds available.

Download from https://github.com/rekkyrosso/ampcast/releases/latest

## Self-hosting

### Docker

Docker images are hosted on `ghcr.io` and are available to view [here](https://github.com/rekkyrosso/ampcast/pkgs/container/ampcast).

Run the container:

```bash
# Run the latest version
docker run --name ampcast -p 8000:8000 ghcr.io/rekkyrosso/ampcast:latest
```

Or with `docker-compose`:

```bash
docker-compose up -d
```

Use this [`docker-compose.yml`](https://raw.githubusercontent.com/rekkyrosso/ampcast/refs/heads/main/docker-compose.yml) file as a template.

### From source code

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

Start the server with a different host/port:

```bash
npm run start:dev -- --host 0.0.0.0 --port 8001
```

You may get CORS errors using anything other than `localhost` but you have the option anyway.

You can optionally create a `.env` file ([example](https://raw.githubusercontent.com/rekkyrosso/ampcast/refs/heads/main/.env.example)) to store API keys and other config options.

## Contributing

I request that you only [open an issue](https://github.com/rekkyrosso/ampcast/issues) for submitting **bug reports**.

Please use the [**Discussions**](https://github.com/rekkyrosso/ampcast/discussions) section on GitHub to send **feature requests**, questions, suggestions or any other feedback.

There is also a [general discussion forum on reddit](https://www.reddit.com/r/ampcast).

## License

[GNU General Public License v3.0 ©](https://github.com/rekkyrosso/ampcast/blob/main/LICENSE)
