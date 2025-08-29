module.exports = {
  apps: [{
    name: 'fastify-app',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    // Fastify 特定优化
    node_args: [
      '--max-http-header-size=16384',
      '--http-server-default-timeout=600000'
    ],
    // 日志配置
    log_file: '/app/logs/combined.log',
    out_file: '/app/logs/out.log',
    error_file: '/app/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    // 高级配置
    listen_timeout: 5000,
    kill_timeout: 3000,
    wait_ready: true,
    autorestart: true
  }]
}