<template>
	<div ref="root">
		<slot :bp="bp"></slot>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

export default Vue.extend({
	name: 'ResizeObserver',
	props: {
		enabled: {
			type: Boolean,
			default: true,
		},
		breakpoints: {
			type: Array,
			validator: (bps: Array<{bp: string, width: number}>) => {
				return Array.isArray(bps) && bps.reduce(
					(accu, {width, bp}) => accu && typeof width === 'number' && typeof bp === 'string'
					, true);
			},
		},
	},
	data(): {observer: ResizeObserver | null, width: number | null} {
		return {
			observer: null,
			bp: '',
		};
	},
	mounted() {
		if (!this.$props.enabled) {
			return;
		}

		const bps = [...(this.breakpoints || [])].sort((a, b) => a.width - b.width);

		const observer = new ResizeObserver((entries) => {
			entries.forEach((entry) => {
				// We wrap it in requestAnimationFrame to avoid this error - ResizeObserver loop limit exceeded
				requestAnimationFrame(() => {
					const newWidth = entry.contentRect.width;
					let newBP = 'default';
					for (let i = 0; i < bps.length; i++) {
						if (newWidth < bps[i].width) {
							newBP = bps[i].bp;
							break;
						}
					}
					this.bp = newBP;
			 });
			});
		});

		this.$data.observer = observer;

		if (this.$refs.root) {
			observer.observe(this.$refs.root);
		}
	},
	beforeDestroy() {
		if (this.$props.enabled) {
			this.$data.observer.disconnect();
		}
	},
});
</script>
