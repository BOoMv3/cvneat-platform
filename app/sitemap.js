const BASE_URL = 'https://www.cvneat.fr';

const staticRoutes = [
  '/',
  '/restaurants',
  '/restaurant-request',
  '/login',
  '/partner',
  '/admin',
  '/delivery',
  '/advertise',
  '/contact',
  '/mentions-legales',
  '/cgv',
];

export default function sitemap() {
  const today = new Date();

  const urls = staticRoutes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: today,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));

  return urls;
}

