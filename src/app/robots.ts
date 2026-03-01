export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/dashboard/'],
        },
        sitemap: 'https://phonesmart.com.br/sitemap.xml',
    }
}
