#!/bin/bash
# Deploy fix for withdrawal swap issue

echo "Copying updated files to server..."

# Copy service file
scp backend/src/services/hostfiService.js root@72.61.97.210:/var/www/myartelab/backend/src/services/

# Copy controller file  
scp backend/src/controllers/hostfiWalletController.js root@72.61.97.210:/var/www/myartelab/backend/src/controllers/

echo "Restarting server..."
ssh root@72.61.97.210 "pm2 restart myartelab"

echo "Done!"
