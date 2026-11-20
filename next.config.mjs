
/** @type {import('next').NextConfig} */

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://placeholder:placeholder@localhost:5432/placeholder_db";
}

const nextConfig = {
  /* Strict build checks enabled: no ignored errors */
};

export default nextConfig;
