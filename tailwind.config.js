export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f3f4f6',
        panel: '#ffffff',
        border: '#d8dce3',
        'border-strong': '#b9bfca',
        text: '#1d2433',
        'text-soft': '#5b6472',
        'text-faint': '#8a92a0',
        accent: '#2563eb',
        'accent-dark': '#1d4ed8',
        'accent-soft': '#e8eefc',
        green: '#15803d',
        'green-soft': '#e7f6ec',
        amber: '#b45309',
        'amber-soft': '#fef3e0',
        red: '#b91c1c',
        'red-soft': '#fdeaea',
        sidebar: '#161c2c',
      },
      fontSize: {
        base: '15px',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
