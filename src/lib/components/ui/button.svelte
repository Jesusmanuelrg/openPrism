<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { tv, type VariantProps } from 'tailwind-variants';

	const buttonVariants = tv({
		base: 'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
		variants: {
			variant: {
				default: 'bg-foreground text-background hover:bg-foreground/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline: 'border border-border bg-background hover:bg-muted',
				secondary: 'bg-muted text-foreground hover:bg-muted/80',
				ghost: 'hover:bg-muted',
				link: 'text-foreground underline-offset-4 hover:underline'
			},
			size: {
				default: 'h-8 px-3 py-1.5 rounded-sm',
				sm: 'h-7 rounded-sm px-2.5 text-xs',
				lg: 'h-9 rounded-sm px-4',
				icon: 'h-8 w-8 rounded-sm'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	type ButtonVariants = VariantProps<typeof buttonVariants>;

	interface Props {
		variant?: ButtonVariants['variant'];
		size?: ButtonVariants['size'];
		class?: string;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		disabled = false,
		type = 'button',
		onclick,
		children
	}: Props & { children?: import('svelte').Snippet } = $props();
</script>

<button
	{type}
	{disabled}
	class={cn(buttonVariants({ variant, size }), className)}
	{onclick}
>
	{@render children?.()}
</button>
