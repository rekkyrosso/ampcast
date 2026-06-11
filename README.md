<p align="center">
  <img width="96px" src="./app/www/icon-192.png" alt="Ampcast"></img>
</p>

<h1 align="center">Ampcast</h1>

<p align="center">Winamp-style music player that aggregates your music in one place.</p>

## Features

* Supports Plex, Jellyfin, Emby, iBroadcast, Navidrome and Subsonic (and variants)
* Additional support for Apple Music, Spotify and YouTube
* Built-in visualizers: Milkdrop (Butterchurn) and others
* Scrobbling for last.fm and ListenBrainz
* Playback from last.fm/ListenBrainz (via search of logged in services)
* Gapless playback / ReplayGain / Lyrics

## Demo

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

```yaml
services:
  ampcast:
    container_name: ampcast
    image: ghcr.io/rekkyrosso/ampcast:latest
    restart: unless-stopped
    ports:
      - 8000:8000
```

<details>
  
<summary>Full docker compose, with all the options</summary>

```yaml
services:
  ampcast:
    container_name: ampcast
    image: ghcr.io/rekkyrosso/ampcast:latest
    restart: unless-stopped
    ports:
      - 8000:8000

    # All environment variables are optional.
    # You can delete this entire section.

    environment:
      # Credentials
      - APPLE_MUSIC_DEV_TOKEN=""
      - GOOGLE_CLIENT_ID="" # For YouTube API access
      - IBROADCAST_CLIENT_ID=""
      - LASTFM_API_KEY=""
      - LASTFM_API_SECRET=""
      - SPOTIFY_CLIENT_ID=""

      # Enabled media services.
      # Available services:
      #    apple,spotify,
      #    airsonic,ampache,emby,gonic,ibroadcast,jellyfin,navidrome,plex,subsonic,
      #    youtube,
      #    internet-radio,
      #    lastfm,listenbrainz
      # Disabling YouTube does not disable playback from YouTube.
      # The order of this list also defines the display order in the UI.
      - ENABLED_SERVICES="" # Leave blank for all services

      # Initially visible services.
      # Changing this later will likely only affect new users.
      - STARTUP_SERVICES="" # If you leave this blank you will get a start-up wizard

      ## Example:
      - ENABLED_SERVICES="spotify,navidrome,lastfm,listenbrainz"
      - STARTUP_SERVICES="spotify,navidrome,lastfm"

      # Personal media servers.
      # Pre-configure a server HOST.
      # Add USER/PASSWORD for automated login (optional).
      # Mark the server as LOCKED to prevent editing any of the supplied fields.
      # Available servers:
      #    AIRSONIC,AMPACHE,EMBY,GONIC,JELLYFIN,NAVIDROME,SUBSONIC

      ## Example:
      - JELLYFIN_HOST="http://localhost:8096"
      - JELLYFIN_USER=""
      - JELLYFIN_PASSWORD=""
      - JELLYFIN_LOCKED=true # Prevents logging in with alternative host/credentials
```
</details>

```bash
docker-compose up -d
```

### From source code

Requires Node >= 24.

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
