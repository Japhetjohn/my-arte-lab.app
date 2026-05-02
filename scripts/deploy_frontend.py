import os
import pty
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
                os.write(sys.stdout.fileno(), data)
                
                if b"password:" in data.lower():
                    time.sleep(1)
                    os.write(fd, PASSWORD)
        except OSError:
            pass
        
        os.waitpid(pid, 0)
        return output.decode('utf-8', errors='ignore')

def main():
    commands = [
        ["rsync", "-avz", "backend/frontend/app/src/layouts/AuthLayout.tsx", "root@72.61.97.210:/var/www/myartelab/backend/frontend/app/src/layouts/AuthLayout.tsx"],
        ["rsync", "-avz", "backend/frontend/app/src/components/layout/TopNavigation.tsx", "root@72.61.97.210:/var/www/myartelab/backend/frontend/app/src/components/layout/TopNavigation.tsx"],
        ["rsync", "-avz", "backend/frontend/app/index.html", "root@72.61.97.210:/var/www/myartelab/backend/frontend/app/index.html"],
        ["ssh", "root@72.61.97.210", "cd /var/www/myartelab/backend/frontend/app && npm install && npm run build && cp -r dist/* /var/www/myartelab/backend/frontend/ && cp -r dist/assets /var/www/myartelab/backend/frontend/ && cd /var/www/myartelab/backend && pm2 restart myartelab"]
    ]
    
    for cmd in commands:
        result = run_with_password(cmd)
        print(f"--- Command Finished ---\n")

if __name__ == "__main__":
    main()
