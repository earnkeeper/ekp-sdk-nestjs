# EKP - Earnkeeper Plugins

`ekp` is the plugin system for [earnkeeper.io](https://earnkeeper.io). It allows you to scrape the blockchain for the information you want to see and display it in tables and graphs for everyone.

![screenshot of earnkeeper plugins page](https://raw.githubusercontent.com/EarnKeeper/ekp/main/docs/images/plugins-page.jpeg)

## Why?

We started [earnkeeper.io](https://earnkeeper.io) to provide unbiased, detailed and honest analysis of projects in the cryptocurrency [Play 2 Earn](https://wiki.rugdoc.io/docs/play-to-earn-games-p2e/) space.

Games are being released in this space very quickly, and we can cover only a very small portion of them. Our community on [Discord](https://discord.gg/XXcuUyehvY) is already brimming with users who love the site and want to help.

We don't want to open source the site itself, as it would be impossible to provide a secure experience to those who trust https://earnkeeper.io showing at the top of their browser.

So instead, we are exposing as much functionality as we possibly can through a websocket specification to any externally hosted webservice.

We love <https://dune.xyz>, it gets low skill users into a place where they can create analytics very quickly. But we got stuck trying to model certain games, it didn't have the power we needed, and its quite difficult to personalize the results to your users.

We are trying to find a way to give developers the power they need for complex analysis, and the flexibility for personalized display results. All while being able to block dangerous interactions with user's wallets.

This repository contains the specification, and a starter project in node.js to get you up and running. Join our [Discord](https://discord.gg/XXcuUyehvY) to get help or information directly!

## Getting Started

Fork and clone this repository.

It contains a fully functioning plugin, which we actually use on https://app.earnkeeper.io.

We don't want to re-invent the wheel, so we use the following open source libraries and frameworks in our code:

- Typescript
- NestJs
- Socket.io
- TypeORM
- Postgres
- EthersJs
- JsonForms
- Werf
- Docker
- Kubernetes
- Helm
- Grafana Loki
- NocoDB

You are free to use any you like, its your plugin after all! You don't even have to use javascript, it can be python, go, whatever you like to develop in. All we specify is a protocol that earnkeeper.io understands.

This project is only intended to get you a start in the language and frameworks that we use ourselves.

We use github to host our code, and github actions to automate our deploys.

To run the example plugin locally...

Create a .env file in the root of the ekp directory:

```
BSCSCAN_API_KEY=
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ekp
DATABASE_SSL=disable
```

Append your BSC SCAN api key to the end of the first line, [you can create one here.](https://bscscan.com/myapikey). You will use this key to pull logs from the blockchain.

Append your Moralis API details to the end of the last two lines, you can create a free Moralis server and get your details [here](https://docs.moralis.io/moralis-server/getting-started/create-a-moralis-server) and [here](https://docs.moralis.io/moralis-server/getting-started/connect-the-sdk#initialize-the-sdk).

You will need a postgres database running on your local machine, if your connection details are different for your local instance, you can change them on the second line.

Then run the following to start the app locally.

```sh
yarn install
nest start farms
```

Go to https://playground.earnkeeper.io/plugins, add a new plugin with url: http://localhost:3001.

After clicking save, you should see the same list of farms that you see on the main site!

You can continue to make changes to your local, and these changes will immediately reflect at https://playground.earnkeeper.io.

Once you are ready to share your creation with the world, follow the deploy instructions below, and share the public host name of your provider with users, they will add your plugin in exactly the same way.

Talk to us in Discord about bundling your plugin with the official earnkeeper site, so that everyone has access to it!

## Deployment

Once you are ready to deploy, check out the deployment instructions [here](docs/DEPLOYMENT.md).
