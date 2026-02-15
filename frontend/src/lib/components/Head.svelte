/**
 * Head component - replaces SvelteKit's svelte:head
 * Manipulates document.head dynamically
 */

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	interface Props {
		title?: string;
		description?: string;
		keywords?: string;
		ogType?: string;
		ogUrl?: string;
		ogTitle?: string;
		ogDescription?: string;
		ogImage?: string;
		ogSiteName?: string;
		twitterCard?: string;
		twitterUrl?: string;
		twitterTitle?: string;
		twitterDescription?: string;
		twitterImage?: string;
		canonical?: string;
		children?: import('svelte').Snippet;
	}
	
	let { 
		title, 
		description, 
		keywords,
		ogType,
		ogUrl,
		ogTitle,
		ogDescription,
		ogImage,
		ogSiteName,
		twitterCard,
		twitterUrl,
		twitterTitle,
		twitterDescription,
		twitterImage,
		canonical,
		children 
	}: Props = $props();
	
	let elements: HTMLElement[] = [];
	
	function setMeta(name: string, content: string, attr: string = 'name') {
		let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
		if (!el) {
			el = document.createElement('meta');
			el.setAttribute(attr, name);
			document.head.appendChild(el);
		}
		el.setAttribute('content', content);
		elements.push(el);
		return el;
	}
	
	function setLink(rel: string, href: string) {
		let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
		if (!el) {
			el = document.createElement('link');
			el.setAttribute('rel', rel);
			document.head.appendChild(el);
		}
		el.setAttribute('href', href);
		elements.push(el);
		return el;
	}
	
	onMount(() => {
		if (title) {
			document.title = title;
		}
		
		if (description) {
			setMeta('description', description);
		}
		
		if (keywords) {
			setMeta('keywords', keywords);
		}
		
		if (canonical) {
			setLink('canonical', canonical);
		}
		
		// Open Graph
		if (ogType) setMeta('og:type', ogType, 'property');
		if (ogUrl) setMeta('og:url', ogUrl, 'property');
		if (ogTitle) setMeta('og:title', ogTitle, 'property');
		if (ogDescription) setMeta('og:description', ogDescription, 'property');
		if (ogImage) setMeta('og:image', ogImage, 'property');
		if (ogSiteName) setMeta('og:site_name', ogSiteName, 'property');
		
		// Twitter
		if (twitterCard) setMeta('twitter:card', twitterCard);
		if (twitterUrl) setMeta('twitter:url', twitterUrl);
		if (twitterTitle) setMeta('twitter:title', twitterTitle);
		if (twitterDescription) setMeta('twitter:description', twitterDescription);
		if (twitterImage) setMeta('twitter:image', twitterImage);
	});
	
	// Note: We don't clean up meta tags on destroy because that would flicker
	// during navigation. Instead, new tags replace old ones.
</script>

{@render children?.()}