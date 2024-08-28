import * as path from 'path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: '@阿星笔记',
  description: '养成记笔记的好习惯',
  icon: '/logo.png',
  logo: {
    light: '/logo-light.png',
    dark: '/logo-dark.png',
  },
  themeConfig: {
    socialLinks: [
      { icon: 'github', mode: 'link', content: 'https://github.com/WX1013' },
    ],
    footer: {
      message: '© 2024 WangXin. All Rights Reserved.'
    }
  },
});
