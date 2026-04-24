import os
import pty
import time

PASSWORD = b"@Kuulsinim45\n"

def run_with_password(command):
    print(f"Executing: {command}")
    pid, fd = pty.fork()
    
    if pid == 0:  # Child process
        os.execvp(command[0], command)
    else:  # Parent process
        output = b""
        try:
            while True:
                data = os.read(fd, 1024)
                if not data:
                    break
                output += data
                # Stream output to console
                os.write(sys.stdout.fileno(), data)
                
                if b"password:" in data.lower():
                    time.sleep(1)
                    os.write(fd, PASSWORD)
        except OSError:
            pass
        
        os.waitpid(pid, 0)
        return output.decode('utf-8', errors='ignore')

import sys
if __name__ == "__main__":
    run_with_password(["ssh", "root@72.61.97.210", "cd /var/www/myartelab/backend && node scripts/fetch-signup-logs.js"])
