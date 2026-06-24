/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors fail the build — the type-system overhaul makes the tree
    // type-clean, so the v0 escape hatch is no longer needed.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
