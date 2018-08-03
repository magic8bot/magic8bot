[![Build Status](https://travis-ci.com/magic8bot/magic8bot.svg?branch=master)](https://travis-ci.com/magic8bot/magic8bot)
[![codecov](https://codecov.io/gh/magic8bot/magic8bot/branch/master/graph/badge.svg)](https://codecov.io/gh/magic8bot/magic8bot)

![logo](https://rawgit.com/magic8bot/magic8bot/master/assets/logo.svg)

## Current Status (UPDATE July 17th '18) - PreAlpha (Not ready for live trading)

Magic8bot a crypto trading bot originally based on Zenbot4. It is a complete rewrite and rethinking of the entire platform.
The overall goals are:

- reducing code repetition
- separation of concerns
- everything in typescript
- allow multiple strategies to run simultaneously
- expose all trading data via a websocket api
- event based signal processing
- creating a new plugin type: position strategy

~notVitaliy

## Disclaimer

- This bot is NOT a sure-fire profit machine. Use it AT YOUR OWN RISK.
- Crypto-currency is still an experiment, and therefore so is this bot. Meaning, both may fail at any time.
- Running a bot, and trading in general requires careful study of the risks and parameters involved. A wrong setting can cause you a major loss.
- Never leave the bot un-monitored for long periods of time. this bot doesn't know when to stop, so be prepared to stop it if too much loss occurs.
- Often times the default trade parameters will underperform vs. a buy-hold strategy, so run some simulations and find the optimal parameters for your chosen exchange/pair before going "all-in".

## Chat with other users

[![logo](https://rawgit.com/magic8bot/magic8bot/master/assets/discord.png)](https://discord.gg/JGCNsh8)

this bot has a Discord chat! You can get in [through this invite link](https://discord.gg/JGCNsh8).

## Development

### Flowchart

Green: Shows directionality of instantiation

Purple: Blunt end of line is directly injected into the arrow end of line

![flowchart](https://rawgit.com/magic8bot/magic8bot/master/assets/flowchart.svg)

## Features

### Docker Integration

Magic8bot can be run in a container. This is advantageous to users who don't want to install node dependencies locally or want to deploy the app on a server. The only prerequisite is Docker. Note that `port 80` must be available.  

#### Docker installation

- Install [Docker](https://www.docker.com/community-edition)  
- Download or clone magic8bot to your machine
- Copy `src/conf.sample.ts` to `src/conf.ts`  
- In `src/conf.ts` change `mongoconf` host from `localhost` to `mongodb`  
- Copy `src/.env-sample` to `src/.env`
- From the root of the repo directory, execute the `up` command as described below

#### Docker Usage

Interacting with an instance of magic8bot running in a container can be cumbersome. A `Makefile` is provided to simplify executing commands. WSL, Linux and Mac users will likely be able to use this feature without difficulty. Most Windows users will need to install `Make`.  
Once `make --v` can be executed successfully, Docker commands can be run with the syntax `make -- <command> <arguments>`. The two dashes are annoying but necessary to enable arguments that begin with a hyphen.  Available commands can be listed with `make list`.  Alternatively, Docker commands can be run as listed in the make targets. For example, `make up` == `docker-compose up -d`  

For users with more sophisticated deployments, [Traefik](https://traefik.io/) is implemented as a reverse-proxy / load balancer. Using this configuration requires that `port 80` is available. For more information about the issue see [this question](https://stackoverflow.com/questions/1430141/port-80-is-being-used-by-system-pid-4-what-is-that). TLDR: Windows users can run `net stop http` in Powershell as an admin.

**The following commands are supported:**  

```bash
# list available make commands  
make list  

# build app as defined in docker-compose.yml
make up  

# stop app without losing data  
make stop  

# start app  
make start  

# build Docker images defined in docker-compose.yml  
make build  

# stop and delete all local Docker objects but keep downloaded images
# ALL DATA WILL BE DELETED
re-build

# stop and delete all Docker objects defined in docker-compose.yml  
# ALL DATA WILL BE DELETED
make destroy  

# show status of Docker objects defined in docker-compose.yml  
make state  

# show Docker logs  
make logs  

# open a shell in the application container  
make shell  

# open a shell in the application container as admin user  
make shellw  

# sync clock in container with host's clock
make time-sync  
```

## Donate

### notVitaliy (author)

BTC: `32gjP2cSQqaoaZ25ixvtqNhM272sRhXWjA`

ETH: `0xF0C99295CE430cc0B2ed6B9aa31a7fC10Cf0EaA9`

![logo](https://rawgit.com/magic8bot/magic8bot/master/assets/logo-sm.svg)

Thanks!
