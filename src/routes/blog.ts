/**
 * Blog Routes for OnHyper.io
 * 
 * Serves blog posts from Markdown files with frontmatter.
 * Provides JSON API for SPA consumption and RSS feed.
 * 
 * ## Blog Post Format
 * 
 * Posts are stored as Markdown files in `/blog/` directory:
 * 
 * ```markdown
 * ---
 * title: "Getting Started with OnHyper"
 * date: "2024-01-15"
 * author: "OnHyper Team"
 * tags: ["tutorial", "getting-started"]
 * featured: true
 * ---
 * 
 * Your markdown content here...
 * ```
 * 
 * ## Endpoints
 * 
 * ### GET /api/blog
 * List all posts (sorted by date, newest first).
 * 
 * **Response (200):**
 * ```json
 * {
 *   "posts": [
 *     {
 *       "slug": "getting-started",
 *       "title": "Getting Started with OnHyper",
 *       "date": "2024-01-15",
 *       "author": "OnHyper Team",
 *       "tags": ["tutorial"],
 *       "excerpt": "First 200 chars of content...",
 *       "featured": true
 *     }
 *   ],
 *   "count": 10
 * }
 * ```
 * 
 * ### GET /api/blog/:slug
 * Get single post with rendered HTML.
 * 
 * **Response (200):**
 * ```json
 * {
 *   "slug": "getting-started",
 *   "title": "Getting Started with OnHyper",
 *   "date": "2024-01-15",
 *   "author": "OnHyper Team",
 *   "tags": ["tutorial"],
 *   "excerpt": "...",
 *   "html": "<p>Rendered HTML...</p>",
 *   "featured": true
 * }
 * ```
 * 
 * **Response (404):** Post not found
 * 
 * ### GET /api/blog/rss
 * RSS 2.0 feed for blog subscribers.
 * 
 * **Response (200):** XML with `Content-Type: application/rss+xml`
 * 
 * ## Caching
 * 
 * Posts are cached in memory for 1 minute (CACHE_TTL = 60000ms).
 * This balances freshness with read performance.
 * 
 * @module routes/blog
 */

import { Hono } from 'hono';
import { marked } from 'marked';
import matter from 'gray-matter';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const blog = new Hono();

// Blog directory path
const BLOG_DIR = join(process.cwd(), 'blog');

// Cache for blog posts (simple in-memory cache)
let postsCache: BlogPost[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  tags: string[];
  excerpt: string;
  content: string;
  html: string;
  featured?: boolean;
}

/**
 * Read all blog posts from the blog directory
 */
function loadPosts(): BlogPost[] {
  // Check cache
  if (postsCache && Date.now() - cacheTime < CACHE_TTL) {
    return postsCache;
  }
  
  const posts: BlogPost[] = [];
  
  try {
    const files = readdirSync(BLOG_DIR);
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = join(BLOG_DIR, file);
      const fileContent = readFileSync(filePath, 'utf-8');
      
      // Parse frontmatter
      const { data, content } = matter(fileContent);
      
      // Create excerpt (first 200 chars of content, stripped of markdown)
      const plainText = content
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/\n/g, ' ')
        .trim();
      const excerpt = plainText.length > 200 ? plainText.slice(0, 200) + '...' : plainText;
      
      // Render markdown to HTML
      const html = marked(content) as string;
      
      // Extract slug from filename (without .md extension)
      const slug = file.replace(/\.md$/, '');
      
      posts.push({
        slug,
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        author: data.author || 'OnHyper Team',
        tags: data.tags || [],
        excerpt,
        content,
        html,
        featured: data.featured || false,
      });
    }
    
    // Sort by date, newest first
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    postsCache = posts;
    cacheTime = Date.now();
    
    return posts;
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return [];
  }
}

/**
 * GET /api/blog
 * List all posts (sorted by date, newest first)
 */
blog.get('/', (c) => {
  const posts = loadPosts();
  
  // Return list without full content/html (lighter response)
  return c.json({
    posts: posts.map(post => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      author: post.author,
      tags: post.tags,
      excerpt: post.excerpt,
      featured: post.featured,
    })),
    count: posts.length,
  });
});

/**
 * GET /api/blog/rss
 * RSS 2.0 feed for blog subscribers
 */
blog.get('/rss', (c) => {
  const posts = loadPosts();
  const baseUrl = 'https://onhyper.io';
  
  // Build RSS XML
  const rssItems = posts.map(post => {
    const postUrl = `${baseUrl}/#/blog/${post.slug}`;
    const pubDate = new Date(post.date).toUTCString();
    
    return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <author>${post.author}</author>
      <pubDate>${pubDate}</pubDate>
      ${post.tags.map(tag => `<category>${tag}</category>`).join('\n      ')}
    </item>`;
  }).join('\n');
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OnHyper Blog</title>
    <link>${baseUrl}/blog</link>
    <atom:link href="${baseUrl}/api/blog/rss" rel="self" type="application/rss+xml" />
    <description>Secure Proxy Service for API-Backed Web Apps - Blog</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>`;
  
  return c.text(rss, 200, {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300', // 5 minutes
  });
});

/**
 * GET /api/blog/:slug
 * Get single post with rendered HTML
 */
blog.get('/:slug', (c) => {
  const slug = c.req.param('slug');
  const posts = loadPosts();
  
  const post = posts.find(p => p.slug === slug);
  
  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }
  
  return c.json({
    slug: post.slug,
    title: post.title,
    date: post.date,
    author: post.author,
    tags: post.tags,
    excerpt: post.excerpt,
    html: post.html,
    featured: post.featured,
  });
});

export { blog };