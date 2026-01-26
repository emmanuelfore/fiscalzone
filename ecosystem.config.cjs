module.exports = {
  apps: [
    {
      name: "fisczim",
      script: "dist/index.cjs",
      interpreter: "node",
      cwd: "/var/www/fisczim",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_URL: "postgresql://user:password@localhost:5432/fisczim"
      }
    }
  ]
};

