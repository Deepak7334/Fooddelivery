const { execSync } = require('child_process');
try {
  const output = execSync('netstat -ano | findstr :5002').toString();
  const lines = output.trim().split('\n');
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length > 4) {
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Killed PID ${pid}`);
        } catch(e) {
          console.log(`Failed to kill PID ${pid}`);
        }
      }
    }
  });
} catch (e) {
  console.log('No process found on 5002');
}
