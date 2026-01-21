import fs from 'fs'
import path from 'path'
import { noble } from '../config/chains.js'

const chainsFile = path.join(
  process.cwd(),
  'node_modules/@nomicfoundation/hardhat-viem/dist/src/internal/chains.js'
)

const content = fs.readFileSync(chainsFile, 'utf8')
const patchedLine = `const chains = [...Object.values(chainsModule), ${JSON.stringify(noble)}];`
const chainsRegex = /const chains = .*?;/

const match = content.match(chainsRegex)

if (!match) {
  console.warn('⚠️ Could not find line to patch')
  process.exit(1)
}

if (match[0] === patchedLine) {
  console.log('✅ Noble chain already up to date')
} else {
  const newContent = content.replace(chainsRegex, patchedLine)
  fs.writeFileSync(chainsFile, newContent)
  console.log('✅ Patched hardhat-viem with Noble chain')
}
