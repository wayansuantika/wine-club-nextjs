import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8EDEF',
          100: '#D1DBE0',
          200: '#A3B7C1',
          300: '#7593A2',
          400: '#4F6D7A',
          500: '#4F6D7A',
          600: '#425E6A',
          700: '#364E59',
          800: '#293E47',
          900: '#1D2E36',
        },
        accent: {
          50: '#EDF5F3',
          100: '#DBEBE7',
          200: '#B7D7CF',
          300: '#93C3B7',
          400: '#7FA99B',
          500: '#7FA99B',
          600: '#6B8F83',
          700: '#57756B',
          800: '#435B53',
          900: '#2F413B',
        },
        neutral: {
          50: '#F5F6F4',
          100: '#E5E7EB',
          200: '#D1D5DB',
          300: '#9CA3AF',
          400: '#6B7280',
          500: '#4B5563',
          600: '#374151',
          700: '#1F2933',
          800: '#1F2937',
          900: '#111827',
        },
        error: {
          500: '#B85C5C',
          600: '#A04A4A',
        },
      },
    },
  },
  plugins: [],
};

export default config;
