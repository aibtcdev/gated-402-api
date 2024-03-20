import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { sha256 } from '@noble/hashes/sha256';
import { getNetwork, getTxVersion } from './utilities';
// @ts-ignore required for Cloudflare Workers but not found locally
import manifest from '__STATIC_CONTENT_MANIFEST';
import { bytesToHex } from '@stacks/common';
import {
	Cl,
	StructuredDataSignature,
	callReadOnlyFunction,
	cvToJSON,
	cvToValue,
	encodeStructuredData,
	getAddressFromPublicKey,
	publicKeyFromSignatureRsv,
	stringAsciiCV,
	tupleCV,
	uintCV,
	validateStacksAddress,
} from '@stacks/transactions';

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

app.get('/favicon.ico', serveStatic({ path: 'favicon.ico', manifest }));
app.get('/favicon-16x16.png', serveStatic({ path: 'favicon-16x16.png', manifest }));
app.get('/favicon-32x32.png', serveStatic({ path: 'favicon-32x32.png', manifest }));
app.get('/favicon-96x96.png', serveStatic({ path: 'favicon-96x96.png', manifest }));

app.get('/bitcoin-face', async (c) => {
	// Check for the X-Stacks-SignedMessageData header
	const signedMessageData = c.req.header('X-Stacks-SignedMessageData');
	if (!signedMessageData) {
		return c.json({ error: 'Missing X-Stacks-SignedMessageData header' }, 400);
	}

	// Check for the address query parameter
	const address = c.req.query('address');
	if (!address || !validateStacksAddress(address)) {
		return c.json({ error: 'Missing address query parameter or incorrect format specified' }, 400);
	}

	// Check for the resource query parameter
	const resource = c.req.query('resource');
	if (!resource) {
		return c.json({ error: 'Missing resource query parameter' }, 400);
	}

	// Check for the network query parameter
	const network = c.req.query('network') || 'testnet';
	if (network !== 'mainnet' && network !== 'testnet') {
		return c.json({ error: 'Invalid network, must be "mainnet" or "testnet"' }, 400);
	}

	// get network object from network param
	const networkObj = getNetwork(network);
	// get tx version object from network param
	const txVersion = getTxVersion(network);

	// create domain object, used for structured signed message
	// TODO: how to make sure this matches client side?
	const domain = tupleCV({
		name: stringAsciiCV('aibtcdev'),
		version: stringAsciiCV('0.0.2'),
		'chain-id': uintCV(networkObj.chainId),
	});

	// create a structured signed message from the data
	// TODO: pass the object in the header instead?
	const signedMessage: StructuredDataSignature = {
		type: 10,
		data: signedMessageData,
	};

	// encode the address as the expected signed message
	// TODO: how to handle knowing the expected message?
	const expectedMessage = encodeStructuredData({
		message: stringAsciiCV(address),
		domain,
	});
	const expectedMessageHashed = sha256(expectedMessage);

	// get the public key from the signed message
	const publicKeyFromSignature = publicKeyFromSignatureRsv(bytesToHex(expectedMessageHashed), signedMessage);

	// get the address from the public key
	const addressFromSignature = getAddressFromPublicKey(publicKeyFromSignature, txVersion);

	// verify the address param matches address from signature
	if (address !== addressFromSignature) {
		return c.json({ error: 'Address provided does not match signature' }, 400);
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
		const name = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}.${invoice.invoiceData.resourceName}.${invoice.invoiceData.userIndex}.${invoice.invoiceData.createdAt}`;
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
	const invoiceDataCV = await callReadOnlyFunction({
		contractName: CONTRACT_NAME,
		contractAddress: CONTRACT_ADDRESS,
		functionName: 'get-recent-payment-data-by-address',
		functionArgs: [Cl.stringUtf8(resourceName), Cl.principal(address)],
		network: getNetwork(network),
		senderAddress: address,
	});

	// handle unpaid invoice
	// probably overkill but checks two things
	// 1. is the ClarityValue type 9 (none)
	// 2. is the value null (which is the case with type 9 / none)
	if (invoiceDataCV.type === 9 || cvToJSON(invoiceDataCV).value === null) {
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

	/* sample returned data from the contract
		{
			type: 10,
			value: {
				type: 12,
				data: {
					amount: { type: 'uint', value: '1000' },
					createdAt: { type: 'uint', value: '148918' },
					resourceIndex: { type: 'uint', value: '1' },
					resourceName: { type: '(string-utf8 12)', value: 'bitcoin-face' },
					userIndex: { type: 'uint', value: '1' }
				}
			}
		}
	*/

	// convert ClarityValue to JSON and get nested value
	const invoiceDataCVValue = cvToJSON(invoiceDataCV).value.value;

	/* shape of object after conversion
		invoiceDataCVValueValue {
			amount: { type: 'uint', value: '1000' },
			createdAt: { type: 'uint', value: '148918' },
			resourceIndex: { type: 'uint', value: '1' },
			resourceName: { type: '(string-utf8 12)', value: 'bitcoin-face' },
			userIndex: { type: 'uint', value: '1' }
		}
	*/

	// create InvoiceData object from Clarity values
	const invoiceData: InvoiceData = {
		amount: invoiceDataCVValue.amount.value,
		createdAt: invoiceDataCVValue.createdAt.value,
		resourceIndex: invoiceDataCVValue.resourceIndex.value,
		resourceName: invoiceDataCVValue.resourceName.value,
		userIndex: invoiceDataCVValue.userIndex.value,
	};

	// handle paid invoice
	return {
		paid: true,
		status: `Payment data found for ${address}.`,
		invoiceData: invoiceData,
	};
}

export default app;
