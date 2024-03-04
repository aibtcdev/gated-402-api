import { getFetchOptions, StacksMainnet, StacksTestnet } from '@stacks/network';

const opts = getFetchOptions();
delete opts.referrerPolicy;

export function getNetwork(network: string) {
	switch (network) {
		case 'mainnet':
			return new StacksMainnet();
		case 'testnet':
			return new StacksTestnet();
		default:
			return new StacksTestnet();
	}
}
