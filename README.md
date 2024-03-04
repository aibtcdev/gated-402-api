<p align="center"><img src="https://github.com/aibtcdev/landing-page/blob/main/public/logos/aibtcdev-logo-sm-250px.png" alt="Bitcoin x AI Logo" width="150px" ></p>

# Bitcoin x AI: Gated 402 API

## Description

This is a simple API that uses a Stacks smart contract to verify access to a resource.

If the user has access, the API returns a 200 status code.

If the user does not have access, the API returns a 402 status code with instructions to pay the invoice.

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
