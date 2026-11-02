/** @type {import('next').NextConfig} */

const nextConfig = {
	turbopack: {},
	webpack: (config, { dev }) => {
		if (dev) {
			config.watchOptions = {
				poll: 1000,
				aggregateTimeout: 300,
			};
		}
		return config;
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	allowedDevOrigins: ["*.theopenbuilder.com"],
};

export default nextConfig;
