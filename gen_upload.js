const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const distDir = 'e:/llmDashboard/dist'
const GW = 'https://edc0k6b2n8o715-1111.proxy.runpod.net'
const SECRET = 'admin_secret_change_this'

const files = []
function walk(dir, rel) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f).replace(/\/g, '/')
    const r = rel ? rel + '/' + f : f
    if (fs.statSync(full).isDirectory()) walk(full, r)
    else files.push({ full, rel: 'dist/' + r })
  })
}
walk(distDir, '')

console.log(`Uploading ${files.length} files to ${GW}...`)
for (const { full, rel } of files) {
  process.stdout.write(`  ${rel} ... `)
  try {
    const result = execSync(
      `curl -s -F "file=@${full}" -F "path=${rel}" -F "admin_secret=${SECRET}" ${GW}/admin/upload`,
      { timeout: 30000 }
    ).toString()
    const json = JSON.parse(result)
    console.log(`OK (${json.size} bytes)`)
  } catch (e) {
    console.log(`FAILED: ${e.message}`)
  }
}
console.log('Done!')
