import { scanRepository } from './secret-scan.mjs'

const result = scanRepository()

if (result.findings.length) {
  console.error(`Unsafe repository content found in: ${result.findings.join(', ')}`)
  process.exit(1)
}

console.log(`Secret scan passed (${result.filesChecked} current files and ${result.historyObjectsChecked} reachable history blobs checked).`)
