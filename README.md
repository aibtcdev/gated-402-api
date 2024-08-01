<img src="https://aibtc.dev/logos/aibtcdev-primary-logo-black-wide-1000px.png" alt="AIBTC Working Group Logo" style="width: 100%; max-width: 1000px; display: block; margin: 1rem auto;" />

# AIBTC Gated 402 API

## Description

This is a simple API that uses a Stacks smart contract to verify access to a resource.

If the user has access, the API returns a 200 status code.

If the user does not have access, the API returns a 402 status code with instructions to pay the invoice.

## Example Endpoint

URL: `/bitcoin-face`

Requires header: `X-Stacks-SignedMessageData`

- data to be signed is the requesting Stacks address as a string
- data passed in header should be the string returned by signing structured data with @stacks/transactions
- helper script defines domain, message format, and returns signed data

Query parameters:

- address (req): the Stacks address requesting the resource
- resource (req): the name of the resource in the smart contract
- network (opt): the Stacks network to return data from ("mainnet" or "testnet", default: "testnet")

Example with curl for local development:

```bash
curl -X GET -H "X-Stacks-SignedMessageData: 424b7c7d4faf0dc3edb5e3ce686341621e9305fdd00434dd15a1254a9ce3a60d3ed5def54e9d588a1d12e499411c42af8f897c497aeb5ff4566cec18afc0052500" "http://localhost:8787/bitcoin-face?resource=bitcoin-face&address=ST2HQ5J6RP8HSQE9KKGWCHW9PT9SVE4TDGBZQ3EKR"
```

Example with curl with hosted API:

```bash
curl -X GET -H "X-Stacks-SignedMessageData: 424b7c7d4faf0dc3edb5e3ce686341621e9305fdd00434dd15a1254a9ce3a60d3ed5def54e9d588a1d12e499411c42af8f897c497aeb5ff4566cec18afc0052500" "https://api.aibtc.dev/bitcoin-face?resource=bitcoin-face&address=ST2HQ5J6RP8HSQE9KKGWCHW9PT9SVE4TDGBZQ3EKR"
```

## Development

Tech stack:

- Wrangler
- Hono
- Stacks.js

To run this locally:

1. Clone repository
2. Install dependencies: `npm install`
3. Run locally: `npm start`

Deployments are handled by Wrangler and Cloudflare Workers.
