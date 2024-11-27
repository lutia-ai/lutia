let intersectionObserver: IntersectionObserver;

/**
 * Ensures that the IntersectionObserver is initialized.
 */
function ensureIntersectionObserver() {
	if (intersectionObserver) return;

	/**
	 * IntersectionObserver callback.
	 * @param {IntersectionObserverEntry[]} entries - The array of entries being observed.
	 */
	intersectionObserver = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			const eventName = entry.isIntersecting ? 'enterViewport' : 'exitViewport';
			entry.target.dispatchEvent(new CustomEvent(eventName));
		});
	});
}

export default function viewport(element: HTMLElement): { destroy: () => void } {
	ensureIntersectionObserver();

	intersectionObserver.observe(element);

	return {
		/**
		 * Disconnects the IntersectionObserver when the element is destroyed.
		 */
		destroy() {
			intersectionObserver.unobserve(element);
		}
	};
}
