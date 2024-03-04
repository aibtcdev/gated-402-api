import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { fetchReadOnlyFunction } from 'micro-stacks/api';
import { principalCV, stringUtf8CV } from 'micro-stacks/clarity';
import { getNetwork } from './utilities';
import { validateStacksAddress } from 'micro-stacks/crypto';

const CONTRACT_NAME = 'stacks-m2m-v2';
const CONTRACT_ADDRESS = 'ST2HQ5J6RP8HSQE9KKGWCHW9PT9SVE4TDGBZQ3EKR';

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
	return c.text('Welcome to the Gated API example using HTTP 402 for invoicing and payment verification through Stacks smart contracts.');
});

app.get('/favicon.ico', serveStatic({ path: 'favicon.ico' }));
app.get('/favicon-16x16.png', serveStatic({ path: 'favicon-16x16.png' }));
app.get('/favicon-32x32.png', serveStatic({ path: 'favicon-32x32.png' }));
app.get('/favicon-96x96.png', serveStatic({ path: 'favicon-96x96.png' }));

app.get('/bitcoin-face', async (c) => {
	// Extract resourceName and address from query params
	const resource = c.req.query('resource');
	const address = c.req.query('address');
	const network = c.req.query('network') || 'testnet';

	// Ensure both parameters are provided
	if (!resource || !address) {
		return c.json({ error: 'Missing resource or address query parameters' }, 400);
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
	const invoice = await getRecentPaymentData(resource, address, network);

	if (!invoice.paid) {
		// if not, return invoice with HTTP 402 (Payment Required)
		return c.json(invoice, 402);
	}

	// if so, return a Bitcoin Face
	if (invoice.invoiceData) {
		// example: https://bitcoinfaces.xyz/api/get-image?name=whoabuddy.sats
		const url = new URL('https://bitcoinfaces.xyz/api/get-image');
		const name = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}.${invoice.invoiceData.resourceName}.${invoice.invoiceData.userIndex}`;
		url.searchParams.append('name', name);
		const response = await fetch(url.toString());
		const svg = await response.text();
		return c.text(svg, 200, { 'Content-Type': 'image/svg+xml' });
	} else {
		return c.text('Unable to generate Bitcoin Face', 500);
	}
});

async function getRecentPaymentData(resourceName: string, address: string, network: string): Promise<PaymentData> {
	// testing with hardcoded address at first
	const invoiceData: InvoiceData | null = await fetchReadOnlyFunction({
		contractName: CONTRACT_NAME,
		contractAddress: CONTRACT_ADDRESS,
		functionName: 'get-recent-payment-data-by-address',
		functionArgs: [stringUtf8CV(resourceName), principalCV(address)],
		network: getNetwork(network),
		senderAddress: address,
	});
	// handle unpaid invoice
	if (invoiceData === null) {
		return {
			paid: false,
			status: `No payment data found for ${address}.`,
			paymentInfo: {
				contractName: CONTRACT_NAME,
				contractAddress: CONTRACT_ADDRESS,
				functionName: 'pay-invoice-by-resource-name',
				functionArgs: [resourceName, 'string-utf8 50', address, 'principal'],
			},
		};
	}
	// handle paid invoice
	return {
		paid: true,
		status: `Payment data found for ${address}.`,
		invoiceData: invoiceData,
	};
}

export default app;
