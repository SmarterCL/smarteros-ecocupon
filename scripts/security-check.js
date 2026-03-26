/**
 * Security Check Script
 * Validates security configuration and environment setup
 */

const fs = require('fs')
const path = require('path')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

let hasErrors = false

function checkFile(filePath, description) {
  const exists = fs.existsSync(path.join(process.cwd(), filePath))
  if (exists) {
    console.log(`${GREEN}✓${RESET} ${description}`)
  } else {
    console.log(`${RED}✗${RESET} ${description} - ${filePath}`)
    hasErrors = true
  }
  return exists
}

function checkEnvVariable(varName, required = true) {
  const value = process.env[varName]
  if (value) {
    // Check if it's a placeholder
    if (value.includes('your_') || value.includes('placeholder')) {
      console.log(`${YELLOW}⚠${RESET} ${varName} - Using placeholder value`)
      hasErrors = true
    } else {
      console.log(`${GREEN}✓${RESET} ${varName} - Configured`)
    }
  } else if (required) {
    console.log(`${RED}✗${RESET} ${varName} - Missing`)
    hasErrors = true
  } else {
    console.log(`${YELLOW}⚠${RESET} ${varName} - Optional, not set`)
  }
}

function checkNoHardcodedKeys() {
  const filesToCheck = [
    'lib/supabase/client.ts',
    'lib/supabase/server.ts',
    'lib/supabase/middleware.ts',
    'proxy.ts',
  ]

  let foundHardcoded = false
  const patterns = [
    /sb_[a-zA-Z0-9]{32,}/,
    /eyJ[a-zA-Z0-9_-]{20,}/,
    /sk_[a-zA-Z0-9]{32,}/,
  ]

  filesToCheck.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      patterns.forEach((pattern) => {
        if (pattern.test(content)) {
          console.log(`${RED}✗${RESET} Hardcoded key found in ${file}`)
          foundHardcoded = true
          hasErrors = true
        }
      })
    }
  })

  if (!foundHardcoded) {
    console.log(`${GREEN}✓${RESET} No hardcoded keys detected`)
  }
}

function checkNextConfig() {
  const configPath = path.join(process.cwd(), 'next.config.mjs')
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8')
    
    const checks = [
      { pattern: /poweredByHeader:\s*false/, name: 'poweredByHeader disabled' },
      { pattern: /X-Frame-Options/, name: 'X-Frame-Options header' },
      { pattern: /Content-Security-Policy/, name: 'CSP header' },
      { pattern: /Strict-Transport-Security/, name: 'HSTS header' },
    ]

    checks.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        console.log(`${GREEN}✓${RESET} ${name}`)
      } else {
        console.log(`${YELLOW}⚠${RESET} ${name} - Not found`)
      }
    })
  }
}

console.log('\n🔒 EcoCupon Security Check\n')
console.log('═'.repeat(50))

console.log('\n📁 Required Files:')
checkFile('.env.local', '.env.local exists')
checkFile('.gitignore', '.gitignore exists')
checkFile('lib/supabase/client.ts', 'Supabase client')
checkFile('lib/supabase/server.ts', 'Supabase server')
checkFile('proxy.ts', 'Proxy Middleware')

console.log('\n🔑 Environment Variables:')
checkEnvVariable('NEXT_PUBLIC_SUPABASE_URL')
checkEnvVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY')
checkEnvVariable('SUPABASE_SERVICE_ROLE_KEY', false)

console.log('\n🚫 Hardcoded Keys Check:')
checkNoHardcodedKeys()

console.log('\n⚙️  Next.js Security Config:')
checkNextConfig()

console.log('\n' + '═'.repeat(50))
if (hasErrors) {
  console.log(`${RED}❌ Security issues found. Please fix before deploying.${RESET}`)
  process.exit(1)
} else {
  console.log(`${GREEN}✅ All security checks passed!${RESET}`)
  process.exit(0)
}
