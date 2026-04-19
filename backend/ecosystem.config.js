module.exports = {
  apps: [{
    name: 'myartelab',
    script: './src/server.js',
    instances: 'max', // Use all CPU cores (or set to number like 4)
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    
    // Memory and resource management
    max_memory_restart: '1G', // Restart if memory exceeds 1GB
    
    // Auto-restart settings
    autorestart: true,
    restart_delay: 3000, // Wait 3s before restarting
    max_restarts: 10, // Max restarts in 15 min window
    min_uptime: '10s', // Min uptime to be considered stable
    
    // Graceful shutdown
    kill_timeout: 5000, // 5s to gracefully close connections
    listen_timeout: 10000, // 10s to start listening
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true, // Merge logs from all instances
    
    // Monitoring
    monitoring: false, // Enable with PM2 Plus if needed
    
    // Advanced settings
    source_map_support: true,
    instance_var: 'INSTANCE_ID', // Environment variable for instance ID
    
    // Health check (optional - requires PM2 Plus)
    // health_check_grace_period: 30000,
  }],
  
  // Deployment config (if using PM2 deploy)
  deploy: {
    production: {
      user: 'root',
      host: '72.61.97.210',
      ref: 'origin/main',
      repo: 'https://github.com/Japhetjohn/my-arte-lab.app.git',
      path: '/var/www/myartelab',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
