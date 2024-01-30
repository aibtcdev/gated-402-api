import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { fetchReadOnlyFunction } from 'micro-stacks/api';
import { noneCV, principalCV, stringUtf8CV } from 'micro-stacks/clarity';
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

// THINKING IT THROUGH V2

// We have a new resource! "Bitcoin Face"

// THINKING IT THROUGH

// we need to know the resource is registered, or error out
//   each resource has a contract call (add-resource), resource index (for resource data), and resource name (unique)
//   could we cache this to reduce overhead per call?
// if the user didn't pay, return HTTP 402 with invoice info (format?)
//   invoice ID is user address + resource index + target Stacks block height
//   user address can be provided or derived from signed message
//   resource name implied by API endpoint
//   resource index can be fetched with name or hard-coded
//   target Stacks block height needs to be figured out
// if the user did pay, return HTTP 200 with the resource
// we could add an endpoint that receives data from a chainhook

// 1. user chooses endpoint (resource) they want to consume
//   openapi spec makes sense here, also machine-readable
//   could be interesting spot to use Gorilla API model
// 2. user signs request with their private key (SIP-018)
//   could be done in browser with modals already supported
//   could be done via script and manual stacks wallet
// 3. user submits request to API endpoint
//   could be done via browser or script
// 4. API endpoint extracts pubkey from signature, gets address
// 5. API endpoint checks if address has paid for resource
// 6. if address has paid, API endpoint returns resource
// 7. if address has not paid, API endpoint returns invoice
// 8. user pays invoice, submits Stacks transaction
// 9. user submits request to API endpoint
// 10. API repeats 4, 5, 6
//   might want queue/retry for updates
//   expring keys as caching strategy

//   submit API request
//   sign message

// WOULD V1 BE SIMPLER AS A WEBSITE WITH STACKS LOGIN FOR VISUAL?
// PAY THE INVOICE FOR ACCESS TO THE RESOURCE
// ALSO WONDERING IF BLOCK HEIGHT IS NECESSARY OR COMPLICATES IT
// user + contract name + resource name + resource index is unique too
// quicker to verify they paid for a resource
// resources could be a map record based on unique ID
// would be hard to know index though

export default app;
