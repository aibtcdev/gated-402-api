import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { fetchReadOnlyFunction } from 'micro-stacks/api';
import { principalCV, stringUtf8CV } from 'micro-stacks/clarity';
import { getNetwork } from './utilities';
import { validateStacksAddress } from 'micro-stacks/crypto';

const app = new Hono();

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

app.get('/', (c) => {
	return c.text('Welcome to the Gated API example using machine-payable transactions on Stacks.');
});

app.get('/favicon.ico', serveStatic({ path: 'favicon.ico' }));

app.get('/bitcoin-face', async (c) => {
	// Extract resourceName and address from query params
	const resource = c.req.query('resource');
	const address = c.req.query('address');
	const network = c.req.query('network') || 'testnet';

	// Ensure both parameters are provided
	if (!resource || !address) {
		return c.json({ error: 'Missing resourceName or address query parameters' }, 400);
	}

	// Ensure stacks address is valid
	if (!validateStacksAddress(address)) {
		return c.json({ error: 'Invalid Stacks address' }, 400);
	}

	// Ensure network is valid
	if (network !== 'mainnet' && network !== 'testnet') {
		return c.json({ error: 'Invalid network, must be "mainnet" or "testnet"' }, 400);
	}

	// check resource is registered / payment data exists
	const paymentData = await getRecentPaymentData(resource, address, network);

	if (!paymentData.paid) {
		// if not, return invoice with HTTP 402 (Payment Required)
		return c.json(paymentData, 402);
	}

	// if so, return resource
	return c.text('Bitcoin Face');
});

async function getRecentPaymentData(resourceName: string, address: string, network: string) {
	// testing with hardcoded address at first
	const paymentData = await fetchReadOnlyFunction({
		contractName: 'stacks-m2m-v1',
		contractAddress: 'ST17EAYFJ9JDJAQ7RGSE6CTGH90MQH68B3FPR7EKP',
		functionName: 'get-recent-payment-data-by-address',
		functionArgs: [stringUtf8CV(resourceName), principalCV(address)],
		network: getNetwork(network),
		senderAddress: address,
	});
	// handle unpaid invoice
	if (paymentData === null) {
		return {
			paid: false,
			statusText: `No payment data found for ${address}.`,
			// TODO: include invoice data in response
			data: null,
		};
	}
	// handle paid invoice
	return {
		paid: true,
		statusText: `Payment data found for ${address}.`,
		data: paymentData,
	};
}

export default app;
