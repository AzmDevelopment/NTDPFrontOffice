/**
 * Global Setup for OWASP ZAP Integration
 * This file starts ZAP in daemon mode before tests run
 */

import { ZapClient } from 'zaproxy';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let zapProcess: any = null;
const ZAP_PORT = 8080;
const ZAP_API_KEY = process.env.ZAP_API_KEY || 'changeme';
const USE_ZAP = process.env.USE_ZAP === 'true' || process.env.CI === 'true';

/**
 * Check if ZAP is already running
 */
async function isZapRunning(): Promise<boolean> {
  try {
    const zapClient = new ZapClient({
      apiKey: ZAP_API_KEY,
      proxy: {
        host: 'localhost',
        port: ZAP_PORT,
      },
    });
    
    await zapClient.core.version();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for ZAP to be ready
 */
async function waitForZap(maxWaitSeconds: number = 60): Promise<boolean> {
  console.log('⏳ Waiting for ZAP to be ready...');
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  
  while (Date.now() - startTime < maxWaitMs) {
    if (await isZapRunning()) {
      console.log('✅ ZAP is ready!');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.stdout.write('.');
  }
  
  console.log('\n❌ ZAP failed to start within timeout');
  return false;
}

/**
 * Start ZAP in daemon mode
 */
async function startZapDaemon(): Promise<void> {
  console.log('🔒 Starting OWASP ZAP in daemon mode...');
  
  // Check if running in Docker (GitHub Actions)
  if (process.env.CI && process.env.GITHUB_ACTIONS) {
    console.log('🐳 Running in GitHub Actions - ZAP should be started by workflow');
    return;
  }
  
  // Try to start ZAP locally
  const zapCommand = process.platform === 'win32' ? 'zap.bat' : 'zap.sh';
  
  try {
    zapProcess = spawn(zapCommand, [
      '-daemon',
      '-port', ZAP_PORT.toString(),
      '-config', `api.key=${ZAP_API_KEY}`,
      '-config', 'api.addrs.addr.name=.*',
      '-config', 'api.addrs.addr.regex=true',
    ], {
      detached: true,
      stdio: 'ignore',
    });
    
    zapProcess.unref();
    
    console.log(`🚀 ZAP daemon started (PID: ${zapProcess.pid})`);
  } catch (error) {
    console.log('⚠️ Could not start ZAP daemon locally:', (error as Error).message);
    console.log('   This is okay if ZAP is already running or in Docker');
  }
}

/**
 * Initialize ZAP session
 */
async function initializeZapSession(): Promise<void> {
  try {
    const zapClient = new ZapClient({
      apiKey: ZAP_API_KEY,
      proxy: {
        host: 'localhost',
        port: ZAP_PORT,
      },
    });
    
    // Create new session
    await zapClient.core.newSession({
      name: `playwright-tests-${Date.now()}`,
      overwrite: 'true',
    });
    
    console.log('✅ ZAP session initialized');
    
    // Enable all passive scanners
    await zapClient.pscan.enableAllScanners();
    console.log('✅ Passive scanners enabled');
    
  } catch (error) {
    console.log('⚠️ Could not initialize ZAP session:', (error as Error).message);
  }
}

/**
 * Global setup function
 */
export default async function globalSetup() {
  if (!USE_ZAP) {
    console.log('ℹ️ ZAP integration disabled (set USE_ZAP=true to enable)');
    return;
  }
  
  console.log('\n🔒 === OWASP ZAP Global Setup ===\n');
  
  // Check if ZAP is already running
  const zapAlreadyRunning = await isZapRunning();
  
  if (!zapAlreadyRunning) {
    // Start ZAP daemon
    await startZapDaemon();
    
    // Wait for ZAP to be ready
    const zapReady = await waitForZap(60);
    
    if (!zapReady) {
      console.log('⚠️ ZAP not available - tests will run without ZAP proxy');
      console.log('   To use ZAP, start it manually: zap.bat -daemon -port 8080 -config api.key=changeme');
      return;
    }
  } else {
    console.log('✅ ZAP is already running');
  }
  
  // Initialize ZAP session
  await initializeZapSession();
  
  // Create reports directory
  const reportsDir = path.join(process.cwd(), 'test-results', 'zap-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  console.log('\n🎯 ZAP proxy ready at: http://localhost:8080');
  console.log('📊 Reports will be saved to: test-results/zap-reports/');
  console.log('\n=================================\n');
}
