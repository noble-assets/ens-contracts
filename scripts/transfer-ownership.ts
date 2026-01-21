import { createWalletClient, createPublicClient, http, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { noble } from '../config/chains.js'

dotenv.config()

const DEPLOYER_KEY = process.env.DEPLOYER_KEY as `0x${string}`
const OWNER_KEY = process.env.OWNER_KEY as `0x${string}`
const FINAL_OWNER_ADDRESS = process.env.FINAL_OWNER_ADDRESS as Address
const RPC_URL = process.env.RPC_URL
const DEPLOYMENTS_DIR = process.env.DEPLOYMENTS_DIR || './deployments/noble'

if (!DEPLOYER_KEY) throw new Error('DEPLOYER_KEY not set in .env')
if (!OWNER_KEY) throw new Error('OWNER_KEY not set in .env')
if (!FINAL_OWNER_ADDRESS) throw new Error('FINAL_OWNER_ADDRESS not set in .env')

const ownableAbi = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'setOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

async function main() {
  const deployerAccount = privateKeyToAccount(DEPLOYER_KEY)
  const ownerAccount = privateKeyToAccount(OWNER_KEY)

  const publicClient = createPublicClient({
    chain: noble,
    transport: http(RPC_URL),
  })

  const deployerWallet = createWalletClient({
    account: deployerAccount,
    chain: noble,
    transport: http(RPC_URL),
  })

  const ownerWallet = createWalletClient({
    account: ownerAccount,
    chain: noble,
    transport: http(RPC_URL),
  })

  console.log(`Transferring ownership to: ${FINAL_OWNER_ADDRESS}`)
  console.log(`Deployer account: ${deployerAccount.address}`)
  console.log(`Owner account: ${ownerAccount.address}`)
  console.log(`Deployments directory: ${DEPLOYMENTS_DIR}`)
  console.log('---')

  const files = fs.readdirSync(DEPLOYMENTS_DIR).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const contractName = file.replace('.json', '')
    const deploymentPath = path.join(DEPLOYMENTS_DIR, file)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

    if (!deployment.address) continue

    const address = deployment.address as Address

    try {
      const currentOwner = await publicClient.readContract({
        address,
        abi: ownableAbi,
        functionName: 'owner',
      })

      const currentOwnerLower = currentOwner.toLowerCase()

      if (currentOwnerLower === FINAL_OWNER_ADDRESS.toLowerCase()) {
        console.log(`${contractName}: Already owned by final owner`)
        continue
      }

      let wallet
      if (currentOwnerLower === ownerAccount.address.toLowerCase()) {
        wallet = ownerWallet
      } else if (currentOwnerLower === deployerAccount.address.toLowerCase()) {
        wallet = deployerWallet
      } else {
        console.log(`${contractName}: Owned by unknown ${currentOwner}, skipping`)
        continue
      }

      // Try transferOwnership first, fall back to setOwner
      let hash
      try {
        hash = await wallet.writeContract({
          address,
          abi: ownableAbi,
          functionName: 'transferOwnership',
          args: [FINAL_OWNER_ADDRESS],
        })
      } catch {
        hash = await wallet.writeContract({
          address,
          abi: ownableAbi,
          functionName: 'setOwner',
          args: [FINAL_OWNER_ADDRESS],
        })
      }

      await publicClient.waitForTransactionReceipt({ hash })
      console.log(`${contractName}: Transferred ✓ (${hash})`)
    } catch (error: any) {
      // Not Ownable - skip
    }
  }

  console.log('---')
  console.log('Done!')
}

main().catch(console.error)