// Clarity types from stacks-m2m contract ported to TS to handle responses

type UserData = {
	address: string;
	totalSpent: number;
	totalUsed: number;
};

type ResourceData = {
	createdAt: number;
	name: string;
	description: string;
	price: number;
	totalSpent: number;
	totalUsed: number;
};

type InvoiceData = {
	amount: number;
	createdAt: number;
	hash: string;
	userIndex: number;
	resourceName: string;
	resourceIndex: number;
};

// Used for response from getRecentPayments() to simplify processing

type PaymentInfo = {
	contractName: string;
	contractAddress: string;
	functionName: string;
	functionArgs: string[];
};

type PaymentData = {
	paid: boolean;
	status: string;
	invoiceData?: InvoiceData;
	paymentInfo?: PaymentInfo;
};
