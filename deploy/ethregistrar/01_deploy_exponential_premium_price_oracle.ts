import { artifacts, deployScript } from '@rocketh'
import type { Address } from 'viem'

export default deployScript(
  async ({ deploy, namedAccounts, network }) => {
    const { deployer } = namedAccounts

    let oracleAddress: Address = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'
    if (network.name !== 'mainnet') {
      const dummyOracle = await deploy('DummyOracle', {
        account: deployer,
        artifact: artifacts.DummyOracle,
        args: [160000000000n], // TODO: Set NOBLE to USD price here, currently set to $1600
      })
      oracleAddress = dummyOracle.address
    }

    await deploy('ExponentialPremiumPriceOracle', {
      account: deployer,
      artifact: artifacts.ExponentialPremiumPriceOracle,
      args: [
        oracleAddress,
        // TODO: Set how much names will cost here
        // 1-2 chars: disabled
        // Current prices are:
        // 3 chars: $640$/year
        // 4 chars: $160$/year
        // 5+ chars: $5$/year
        // Formula: price_per_second = (yearly_usd * 1e18) / 31536000
        // Example for 3 chars: (640 * 1e18) / 31536000 = 20294266869609
        [0n, 0n, 20294266869609n, 5073566717402n, 158548959919n],
        100000000000000000000000000n, // Premium decay during expiration time (starts with 100M USD) and expires in 21 days
        21n,
      ],
    })
  },
  {
    id: 'ExponentialPremiumPriceOracle v1.0.0',
    tags: [
      'category:ethregistrar',
      'ExponentialPremiumPriceOracle',
      'DummyOracle',
    ],
    dependencies: [],
  },
)
