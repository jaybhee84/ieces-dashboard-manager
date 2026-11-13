import { spawn } from 'node:child_process'
import electronPath from 'electron'

// VS Code terminals set ELECTRON_RUN_AS_NODE=1, which makes Electron run as plain Node; even an empty value counts.
const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5183' }
delete env.ELECTRON_RUN_AS_NODE

spawn(electronPath, ['.'], { stdio: 'inherit', env }).on('exit', (code) => process.exit(code ?? 0))
