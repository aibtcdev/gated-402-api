import { getFetchOptions, StacksMainnet, StacksTestnet } from '@stacks/network';
import { TransactionVersion } from '@stacks/transactions';

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

export function getTxVersion(network: string) {
	switch (network) {
		case 'mainnet':
			return TransactionVersion.Mainnet;
		case 'testnet':
			return TransactionVersion.Testnet;
		default:
			return TransactionVersion.Testnet;
	}
}
