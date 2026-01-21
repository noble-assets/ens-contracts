import { defineChain } from 'viem'

export const noble = defineChain({
  id: 662532,
  name: 'Noble',
  network: 'noble',
  nativeCurrency: { decimals: 18, name: 'NOBLE', symbol: 'NOBLE' },
  rpcUrls: { default: { http: ['https://rpc.devnet.noble.xyz/'] } },
})
