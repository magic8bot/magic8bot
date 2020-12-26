[![Build Status](https://travis-ci.com/magic8bot/magic8bot.svg?branch=master)](https://travis-ci.com/magic8bot/magic8bot)
[![codecov](https://codecov.io/gh/magic8bot/magic8bot/branch/master/graph/badge.svg)](https://codecov.io/gh/magic8bot/magic8bot)

![logo](https://rawgit.com/magic8bot/magic8bot/master/assets/logo.svg)

# How To Use

**The master branch is unstable. Do not depend on it working correctly or even running at all.**

checkout [stable](https://github.com/magic8bot/magic8bot/tree/stable)

## Requirements

- [node](https://nodejs.org/en/)
- [mongodb](https://www.mongodb.com/)
- [The UI](https://github.com/magic8bot/ui/tree/stable)\*

The only 2 supported exchanges are `coinbasepro` and `binance` although the bot is capable of supporting any exchange that `ccxt` supports with the addition of small adapter file, found in`./src/exchange/adapters`.

There are a minimal amount of strategies and technical indicators implemented as well.

\*The UI is not required to run. It just makes things easier.

_If you have questions, just ask on discord. The invite link is below._

## Magic8Bot Installation

There are 2 repos (magic8bot and ui) that need to be installed. To do that, you will need to clone them. Let's go!

Clone the magic8bot repo:

    git clone https://github.com/magic8bot/magic8bot.git

Clone the UI repo:

    git clone https://github.com/magic8bot/ui.git

Go to /magic8bot folder and run:

    npm install

Go to /ui folder and run:

    npm install

You also need a `.env` inside the `/magic8bot` folder. You can just copy `.env-sample` and rename it `.env`

Once you're done you need to run this command in both the `magic8bot` and `ui` folders:

    npm run start:dev

> you'll need to open 2 terminals

# Development

M8bot is entering stage 2 of development. I'm separating out all the moving parts into stateless microservices. The idea is to be able to auto-scale individual parts of the bot as load increases on each part.

The parts:

- [ui](https://github.com/magic8bot/ui)
  - Is the UI/control panel for the bot
- [web-server](https://github.com/magic8bot/web-server)
  - This is the layer that sits between the UI and the bot
- [smq](https://github.com/magic8bot/smq)
  - Not a micro-service but a critical shared library
  - Used for communication between micro-services
- [db](https://github.com/magic8bot/db)
  - Not a micro-service but a critical shared library
  - Used for establishing a connectio to the database
  - Provides shared data models for the micro-services
- `pub/sub`
  - Not yet implemented
  - Publishes events for mass consumption
  - Might be integrated into `smq`
- `trade`
  - Currently part of core but will be a micro-service
  - Handles syncing data from the exchange to the database
- `period`
  - Currently part of core but will be a micro-service
  - Generates candle (OHLCv) data
  - Emits candle data events via pub/sub
- `strategy`
  - Currently part of core but will be a micro-service
  - Listens to candle events
  - Calculates signals
  - Sends signals via simple message queue
- `order`
  - Currently part of core but will be a micro-service
  - Handles opening and closing positions
  - Consumes signal via simple message queue

## Disclaimer

- This bot is NOT a sure-fire profit machine. Use it AT YOUR OWN RISK.
- Crypto-currency is still an experiment, and therefore so is this bot. Meaning, both may fail at any time.
- Running a bot, and trading in general requires careful study of the risks and parameters involved. A wrong setting can cause you a major loss.
- Never leave the bot un-monitored for long periods of time. this bot doesn't know when to stop, so be prepared to stop it if too much loss occurs.
- Often times the default trade parameters will underperform vs. a buy-hold strategy, so run some simulations and find the optimal parameters for your chosen exchange/pair before going "all-in".

## Chat with other users

[![logo](https://rawgit.com/magic8bot/magic8bot/master/assets/discord.png)](https://discord.gg/JGCNsh8)

this bot has a Discord chat! You can get in [through this invite link](https://discord.gg/JGCNsh8).

## Donate

### notVitaliy (author)

BTC: `3Q5DP8gRR5rxyzrfDRkCYgaFESsrj9Ti7o`

ETH: `0xF0C99295CE430cc0B2ed6B9aa31a7fC10Cf0EaA9`

![logo](https://rawgit.com/magic8bot/magic8bot/master/assets/logo-sm.svg)

Thanks!
