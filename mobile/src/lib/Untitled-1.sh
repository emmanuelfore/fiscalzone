
 cat > /var/www/fisczim/start.sh << 'EOF'
 #!/bin/bash
 set -a
 source /var/www/fisczim/.env
 set +a
 exec node /var/www/fisczim/dist/index.cjs
 EOF
 chmod +x /var/www/fisczim/start.sh
 cat > /var/www/fisczim/ecosystem.config.json << 'EOF'
 {
     "apps": [{
         "name": "fiscalstack",
         "script": "/var/www/fisczim/start.sh",
         "cwd": "/var/www/fisczim",
         "interpreter": "bash",
         "instances": 1,
         "exec_mode": "fork",cat > /var/www/fisczim/start.sh << 'EOF'
 #!/bin/bash
 set -a
 source /var/www/fisczim/.env
 set +a
 exec node /var/www/fisczim/dist/index.cjs
 EOF
         "error_file": "./logs/pm2-error.log",
         "out_file": "./logs/pm2-out.log",
         "autorestart": true,
         "max_restarts": 10,
         "min_uptime": "10s",
         "watch": false
     }]
 }
 EOF
 # Kill manual process first
 kill 226449 2>/dev/null
 pm2 kill
 cd /var/www/fisczim && pm2 start ecosystem.config.json
 pm2 save
 sleep 10
 

 
 curl http://localhost:5000
 cat > /var/www/fiscalzone/fisczim/start.sh << 'EOF'
 #!/bin/bash
 set -a
 source /var/www/fiscalzone/fisczim/.env
 set +a
 exec node /var/www/fiscalzone/fisczim/dist/index.cjs
 EOF
 chmod +x /var/www/fiscalzone/fisczim/start.sh
 cat > /var/www/fiscalzone/fisczim/ecosystem.config.json << 'EOF'
 {
     "apps": [{
         "name": "fiscalzone",
         "script": "/var/www/fiscalzone/fisczim/start.sh",
         "cwd": "/var/www/fiscalzone/fisczim",
         "interpreter": "bash",
         "instances": 1,
         "exec_mode": "fork",
         "error_file": "./logs/pm2-error.log",
         "out_file": "./logs/pm2-out.log",
         "autorestart": true,
         "max_restarts": 10,
         "min_uptime": "10s",
         "watch": false
     }]
 }
 EOF
 cd /var/www/fiscalzone/fisczim && pm2 start ecosystem.config.json
 pm2 save
 sleep 10
 curl http://localhost:5001
