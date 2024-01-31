import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { fetchReadOnlyFunction } from 'micro-stacks/api';
import { principalCV, stringUtf8CV } from 'micro-stacks/clarity';
import { StacksMainnet, StacksTestnet } from 'micro-stacks/network';

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
	// check resource is registered / payment data exists
	const paymentData = await getRecentPaymentData();

	if (!paymentData.status) {
		// if not, return invoice
		// return c.text(`Please pay first: ${JSON.stringify(paymentData)}`);
		return c.json(paymentData);
	}

	// if so, return resource
	return c.text('Bitcoin Face');
});

const NETWORK = (network: string) => {
	switch (network) {
		case 'mainnet':
			return new StacksMainnet();
		case 'testnet':
			return new StacksTestnet();
		default:
			return new StacksTestnet();
	}
};

async function getRecentPaymentData() {
	// testing with hardcoded address at first
	const address = 'ST2TY3WNDVY1ZSXCPCFYK9KDJJC2TFWYVWNBXNHD4';
	const paymentData = await fetchReadOnlyFunction({
		contractName: 'stacks-m2m-v1',
		contractAddress: 'ST17EAYFJ9JDJAQ7RGSE6CTGH90MQH68B3FPR7EKP',
		functionName: 'get-recent-payment-data-by-address',
		functionArgs: [stringUtf8CV('Bitcoin Face'), principalCV(address)],
		network: NETWORK('testnet'),
		senderAddress: address,
	});
	if (paymentData === null) {
		return {
			status: false,
			statusText: `No payment data found for ${address}.`,
			data: null,
		};
	}
	return {
		status: true,
		statusText: `Payment data found for ${address}.`,
		data: paymentData,
	};
}

export default app;
