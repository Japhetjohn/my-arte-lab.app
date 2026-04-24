import os
import pty
import subprocess
import time
import sys

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
                # sys.stdout.buffer.write(data)
                # sys.stdout.buffer.flush()
                
                if b"password:" in data.lower():
                    time.sleep(1)
                    os.write(fd, PASSWORD)
                    print("\n[Auto-Deploy] Password sent")
        except OSError:
            pass
        
        os.waitpid(pid, 0)
        return output.decode('utf-8', errors='ignore')

def main():
    commands = [
        ["rsync", "-avz", "backend/src/services/bookingService.js", "root@72.61.97.210:/var/www/myartelab/backend/src/services/"],
        ["rsync", "-avz", "backend/src/services/projectService.js", "root@72.61.97.210:/var/www/myartelab/backend/src/services/"],
        ["rsync", "-avz", "backend/scripts/fetch-signup-logs.js", "root@72.61.97.210:/var/www/myartelab/backend/scripts/"],
        ["ssh", "root@72.61.97.210", "pm2 restart myartelab"]
    ]
    
    for cmd in commands:
        result = run_with_password(cmd)
        print(f"--- Command Finished ---\n")

if __name__ == "__main__":
    main()
