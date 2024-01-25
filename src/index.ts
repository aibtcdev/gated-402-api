import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

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

// THINKING IT THROUGH
// we need to know the resource is registered, or error out
// if the user didn't pay, return 402 with invoice info
// if the user did pay, return 200 with the resource

// TO KNOW IF USER PAID
// we need to know the user's address
// we need to know the resource index (or name)
// we need to know the target Stacks block height
// we could use chainhooks and receive events?

export default app;
