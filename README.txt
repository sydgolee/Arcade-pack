8-BIT ARCADE PACK v1.4.0
Six free 8-bit browser games by Syd Golee.

Live: https://arcade-pack.s-golee.workers.dev  (also https://sydgolee.github.io/Arcade-pack/)

Front end: plain HTML/JS pages served from GitHub Pages and proxied by the Cloudflare Worker.
Pages: index (games), scores, trophies, settings, about, privacy, 404.
Shared code: arcade.js (settings, sound, trophies, leaderboards), net.js (online play),
cup.js (Quick Match + tournaments), shell.js (tab bar), site.css.

Server (server/): Cloudflare Worker + D1 (leaderboards, Hall of Champions) +
Durable Objects: Room (referees online games, keeps fleets secret) and Lobby
(players online, Quick Match, tournaments). Deploys automatically from this repo.

Saves and settings stay in the browser. Online features send only the player name,
a random player ID, country and scores/moves. See privacy.html.
