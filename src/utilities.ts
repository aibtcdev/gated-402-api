import { StacksMainnet, StacksTestnet } from 'micro-stacks/network';

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
